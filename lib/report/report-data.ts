import {
  AREAS,
  QUESTIONS,
  answerSummary,
  countAnswered,
  isQuestionVisible,
  scores,
  visibleQuestionCount,
  type Contract,
  type ThemeStatus,
  type WizardAnswers,
} from "@/lib/wizard/schema"
import type { AnalysisRow, CustomerRow } from "@/lib/data/portal"
import type { AdvisorProfile } from "@/lib/auth/advisor"
import type { ReportCalculator, ReportContract, ReportData } from "@/lib/report/advisory-report"

type Snapshot = {
  answers?: WizardAnswers
  themeStatus?: Record<string, ThemeStatus>
  contracts?: Record<string, Contract>
  calculatorResults?: Record<string, ReportCalculator>
  closing?: {
    appointment?: { date?: string; time?: string; place?: string; purpose?: string }
  }
  notes?: Array<string | { text?: string; note?: string }>
}

const YEAR = 2026

/**
 * Maps a persisted analysis (+ customer + advisor) into the flat ReportData
 * shape the PDF generator expects. All figures come from the same snapshot the
 * wizard and calculators write to, so the report always matches the live tool.
 */
export function buildReportData(
  analysis: AnalysisRow,
  customer: CustomerRow | null,
  advisor: AdvisorProfile | null,
): ReportData {
  const snapshot = (analysis.latest_snapshot as Snapshot | null) ?? {}
  const answers: WizardAnswers = snapshot.answers ?? {}
  const themeStatus = snapshot.themeStatus ?? {}
  const areaScores = scores(answers)

  const customerName = customer
    ? [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim()
    : (analysis.title ?? "Kundin / Kunde")

  const contracts: Record<string, ReportContract> = {}
  Object.entries(snapshot.contracts ?? {}).forEach(([key, c]) => {
    contracts[key] = {
      product: c.product ?? key.split("::")[0],
      company: c.company,
      pol: c.pol,
      premium: c.premium,
      interval: c.interval,
      abl: c.abl,
      notes: c.notes,
      start: c.start,
    }
  })

  const calculators: Record<string, ReportCalculator> = {}
  Object.entries(snapshot.calculatorResults ?? {}).forEach(([key, value]) => {
    if (!value || typeof value !== "object") return
    calculators[key] = {
      ...value,
      calculationYear: Number(value.calculationYear) || YEAR,
    }
  })

  return {
    customerName,
    createdAt: analysis.created_at,
    analysisId: analysis.id,
    answerCount: countAnswered(answers),
    questionCount: visibleQuestionCount(answers),
    areas: AREAS.map((a) => ({
      key: a.key,
      name: a.name,
      score: areaScores[a.key],
      status: (themeStatus[a.key] ?? "open") as ThemeStatus,
    })),
    contracts,
    customer: customer
      ? {
          birthdate: customer.birthdate,
          email: customer.email,
          phone: customer.phone,
          postcode: customer.postcode,
          city: customer.city,
        }
      : undefined,
    advisor: advisor
      ? {
          display_name: advisor.display_name,
          first_name: advisor.first_name,
          last_name: advisor.last_name,
          email: advisor.email,
        }
      : undefined,
    answers: QUESTIONS
      .filter((q) => isQuestionVisible(q, answers))
      .map((q) => ({
        id: q.id,
        question: q.t,
        answer: answerSummary(q, answers),
      })),
    modules: {
      calculators,
      appointment: snapshot.closing?.appointment,
    },
    notes: snapshot.notes,
  }
}

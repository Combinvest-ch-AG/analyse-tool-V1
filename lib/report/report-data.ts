import {
  AREAS,
  QUESTIONS,
  answerLabel,
  countAnswered,
  scores,
  TOTAL_QUESTIONS,
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
  calculatorResults?: Record<string, { results?: string[]; savedAt?: string }>
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
    if (!value || !Array.isArray(value.results) || !value.results.length) return
    calculators[key] = { results: value.results, calculationYear: YEAR }
  })

  return {
    customerName,
    createdAt: analysis.created_at,
    analysisId: analysis.id,
    answerCount: countAnswered(answers),
    questionCount: TOTAL_QUESTIONS,
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
    answers: QUESTIONS.map((q) => ({
      id: q.id,
      question: q.t,
      answer: answerLabel(q, answers[q.id] ?? null),
    })),
    modules: { calculators },
    notes: snapshot.notes,
  }
}

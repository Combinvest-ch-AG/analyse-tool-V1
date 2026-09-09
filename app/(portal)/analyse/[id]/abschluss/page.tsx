import { notFound } from "next/navigation"
import { getAnalysis, getCustomerById } from "@/lib/data/portal"
import { fullName } from "@/lib/format"
import {
  AREAS,
  scores,
  countAnswered,
  visibleQuestionCount,
  type Contracts,
  type ThemeStatus,
  type WizardAnswers,
} from "@/lib/wizard/schema"
import { ClosingFlow, type ClosingArea } from "@/components/portal/closing/closing-flow"

export default async function AbschlussPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const analysis = await getAnalysis(id)
  if (!analysis) notFound()
  const customer = await getCustomerById(analysis.customer_id)
  if (!customer) notFound()

  const snapshot = (analysis.latest_snapshot ?? {}) as {
    answers?: WizardAnswers
    contracts?: Contracts
    themeStatus?: Record<string, ThemeStatus>
    referral?: unknown
    documents?: unknown
    closing?: {
      appointment?: { date?: string; time?: string; place?: string; purpose?: string }
      confirmations?: boolean[]
      completedAt?: string | null
    }
  }

  const answers = snapshot.answers ?? {}
  const themeStatus = snapshot.themeStatus ?? {}
  const scoreMap = scores(answers)

  const areas: ClosingArea[] = AREAS.map((a) => ({
    key: a.key,
    name: a.name,
    score: scoreMap[a.key] ?? 0,
    status: (themeStatus[a.key] as ClosingArea["status"]) ?? "open",
    recommendation: a.recommendation,
  }))

  const closing = snapshot.closing ?? {}

  return (
    <main className="px-5 py-8 sm:px-8 lg:px-10">
      <ClosingFlow
        analysisId={analysis.id}
        customerName={fullName(customer.first_name, customer.last_name)}
        answeredCount={countAnswered(answers)}
        totalQuestions={visibleQuestionCount(answers)}
        contractCount={Object.keys(snapshot.contracts ?? {}).length}
        areas={areas}
        hasReferral={Boolean(snapshot.referral)}
        hasDocuments={Boolean(snapshot.documents)}
        initialAppointment={closing.appointment ?? {}}
        initialConfirmations={closing.confirmations ?? []}
        completedAt={closing.completedAt ?? null}
        isCompleted={analysis.status === "completed"}
      />
    </main>
  )
}

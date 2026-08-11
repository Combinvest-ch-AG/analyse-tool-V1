import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getAnalysis, getCustomerById } from "@/lib/data/portal"
import { AnalysisWizard } from "@/components/portal/wizard/analysis-wizard"
import { AnalysisNotes } from "@/components/portal/analysis-notes"
import { fullName } from "@/lib/format"
import { PROFILING_SCHEMA_VERSION, type Contracts, type ThemeStatus, type WizardAnswers } from "@/lib/wizard/schema"

function ageFromBirthdate(birthdate?: string | null): number | null {
  if (!birthdate) return null
  const born = new Date(birthdate)
  if (Number.isNaN(born.valueOf())) return null
  const today = new Date()
  let age = today.getFullYear() - born.getFullYear()
  if (today < new Date(today.getFullYear(), born.getMonth(), born.getDate())) age--
  return Math.max(18, Math.min(80, age))
}

function normalizeLegacyAnswers(input: WizardAnswers): WizardAnswers {
  const answers = { ...input }
  if (answers.rauchen === "ja") answers.rauchen = ["zigaretten"]
  if (answers.rauchen === "nein") answers.rauchen = ["keine"]
  if (answers.zivilstand === "partnerschaft") answers.zivilstand = "konkubinat"
  if (answers.konfession === "christlich" || answers.konfession === "muslimisch") answers.konfession = "andere"
  return answers
}

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const analysis = await getAnalysis(id)
  if (!analysis) notFound()

  const customer = await getCustomerById(analysis.customer_id)
  if (!customer) notFound()

  // Load the stored snapshot, or prefill from the customer record on first open.
  const snapshot = (analysis.latest_snapshot ?? {}) as {
    answers?: WizardAnswers
    contracts?: Contracts
    themeStatus?: Record<string, ThemeStatus>
    profiling_schema_version?: number
    notes?: Record<string, string>
  }
  const stored = normalizeLegacyAnswers(snapshot.answers ?? {})

  const prefill: WizardAnswers = {}
  const age = ageFromBirthdate(customer.birthdate)
  if (age != null) prefill.alter = age
  if (customer.postcode) prefill.plz = customer.postcode

  const answers: WizardAnswers = { ...prefill, ...stored }
  const storedQuestion = typeof analysis.current_question === "number" ? analysis.current_question : 0
  const initialQuestion =
    Number(snapshot.profiling_schema_version || 0) < PROFILING_SCHEMA_VERSION && storedQuestion >= 6
      ? storedQuestion + 1
      : storedQuestion

  return (
    <main className="px-5 py-8 sm:px-8 lg:px-10">
      <Link
        href={`/kunde/${customer.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Kundenprofil
      </Link>

      <AnalysisWizard
        analysisId={analysis.id}
        customerId={customer.id}
        customerName={fullName(customer.first_name, customer.last_name)}
        initialAnswers={answers}
        initialContracts={snapshot.contracts ?? {}}
        initialThemeStatus={snapshot.themeStatus ?? {}}
        initialStep={analysis.current_step ?? 1}
        initialQuestion={initialQuestion}
        initialLockVersion={analysis.lock_version}
        isCompleted={analysis.status === "completed"}
      />

      <div className="mt-6">
        <AnalysisNotes analysisId={analysis.id} initialNotes={snapshot.notes} />
      </div>
    </main>
  )
}

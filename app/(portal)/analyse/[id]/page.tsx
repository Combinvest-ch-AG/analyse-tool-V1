import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getAnalysis, getCustomerById } from "@/lib/data/portal"
import { AnalysisWizard } from "@/components/portal/wizard/analysis-wizard"
import { fullName } from "@/lib/format"
import type { Contracts, ThemeStatus, WizardAnswers } from "@/lib/wizard/schema"

function ageFromBirthdate(birthdate?: string | null): number | null {
  if (!birthdate) return null
  const born = new Date(birthdate)
  if (Number.isNaN(born.valueOf())) return null
  const today = new Date()
  let age = today.getFullYear() - born.getFullYear()
  if (today < new Date(today.getFullYear(), born.getMonth(), born.getDate())) age--
  return Math.max(18, Math.min(80, age))
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
  }
  const stored = snapshot.answers ?? {}

  const prefill: WizardAnswers = {}
  const age = ageFromBirthdate(customer.birthdate)
  if (age != null) prefill.alter = age
  if (customer.postcode) prefill.plz = customer.postcode

  const answers: WizardAnswers = { ...prefill, ...stored }

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
        initialQuestion={typeof analysis.current_question === "number" ? analysis.current_question : 0}
        initialLockVersion={analysis.lock_version}
        isCompleted={analysis.status === "completed"}
      />
    </main>
  )
}

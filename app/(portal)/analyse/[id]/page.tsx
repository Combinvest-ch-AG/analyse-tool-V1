import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getAnalysis, getCustomerById } from "@/lib/data/portal"
import { AnalysisWizard } from "@/components/portal/wizard/analysis-wizard"
import { fullName } from "@/lib/format"
import type { WizardAnswers } from "@/lib/wizard/schema"

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const analysis = await getAnalysis(id)
  if (!analysis) notFound()

  const customer = await getCustomerById(analysis.customer_id)
  if (!customer) notFound()

  // Load stored answers, or prefill from the customer record on first open.
  const snapshot = (analysis.latest_snapshot ?? {}) as { answers?: WizardAnswers }
  const stored = snapshot.answers ?? {}
  const answers: WizardAnswers = {
    geburtsdatum: customer.birthdate ?? null,
    wohnort_plz: customer.postcode ? Number(customer.postcode) : null,
    ...stored,
  }

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
        initialStep={analysis.current_step ?? 1}
        initialLockVersion={analysis.lock_version}
        isCompleted={analysis.status === "completed"}
      />
    </main>
  )
}

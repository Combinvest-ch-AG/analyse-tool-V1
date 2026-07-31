import { notFound } from "next/navigation"
import { getAnalysis, getCustomerById } from "@/lib/data/portal"
import { getCurrentAdvisor } from "@/lib/auth/advisor"
import { DocumentBuilder, type DocumentPrefill } from "@/components/portal/documents/document-builder"

export default async function DokumentePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const analysis = await getAnalysis(id)
  if (!analysis) notFound()
  const customer = await getCustomerById(analysis.customer_id)
  if (!customer) notFound()
  const advisor = await getCurrentAdvisor()
  const snapshot = analysis.latest_snapshot ?? {}
  const initialDocuments = snapshot.documents && typeof snapshot.documents === "object" && !Array.isArray(snapshot.documents)
    ? snapshot.documents as Record<string, unknown>
    : undefined

  const prefill: DocumentPrefill = {
    advisorName: advisor?.display_name ?? "",
    advisorEmail: advisor?.email ?? "",
    finma: "",
    advisorStreet: "",
    advisorZipCity: "",
    firstName: customer.first_name,
    lastName: customer.last_name,
    birthdate: customer.birthdate ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    street: "",
    zip: customer.postcode ?? "",
    city: customer.city ?? "",
  }

  return (
    <main className="px-5 py-8 sm:px-8 lg:px-10">
      <DocumentBuilder analysisId={analysis.id} customerId={analysis.customer_id} prefill={prefill} initial={initialDocuments} />
    </main>
  )
}

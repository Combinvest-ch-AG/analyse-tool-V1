import { notFound } from "next/navigation"
import { getAnalysis, getCustomerById } from "@/lib/data/portal"
import { fullName } from "@/lib/format"
import { ReferralForm, type ReferralData } from "@/components/portal/referral/referral-form"

export default async function ReferralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const analysis = await getAnalysis(id)
  if (!analysis) notFound()

  const customer = await getCustomerById(analysis.customer_id)
  if (!customer) notFound()

  const snapshot = (analysis.latest_snapshot ?? {}) as { referral?: ReferralData | null }
  const initial = snapshot.referral ?? {}

  return (
    <main className="px-5 py-8 sm:px-8 lg:px-10">
      <ReferralForm
        analysisId={analysis.id}
        customerName={fullName(customer.first_name, customer.last_name)}
        initial={initial}
      />
    </main>
  )
}

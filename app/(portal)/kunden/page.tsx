import type { Metadata } from "next"
import { getCurrentAdvisor } from "@/lib/auth/advisor"
import { getDashboardData } from "@/lib/data/portal"
import { NewCustomerDialog } from "@/components/portal/new-customer-dialog"
import { CustomersList } from "@/components/portal/customers-list"

export const metadata: Metadata = {
  title: "Kunden · Combinvest",
  description: "Alle Kunden im Überblick – suchen, öffnen und neue Kunden erfassen.",
}

export default async function KundenPage() {
  const advisor = await getCurrentAdvisor()
  if (!advisor) return null

  const { customers, analyses } = await getDashboardData(advisor.id)
  const withAnalysis = new Set(analyses.map((a) => a.customer_id))
  const rows = customers.map((c) => ({ ...c, hasAnalysis: withAnalysis.has(c.id) }))

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">Verzeichnis</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">Kunden</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {customers.length} {customers.length === 1 ? "Kunde" : "Kunden"} in Ihrer Organisation.
          </p>
        </div>
        <NewCustomerDialog label="Kunde erfassen" />
      </div>

      <CustomersList customers={rows} />
    </main>
  )
}

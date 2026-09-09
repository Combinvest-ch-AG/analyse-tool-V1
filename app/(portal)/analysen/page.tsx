import type { Metadata } from "next"
import { getCurrentAdvisor } from "@/lib/auth/advisor"
import { getDashboardData } from "@/lib/data/portal"
import { AnalysesList, type AnalysisListItem } from "@/components/portal/analyses-list"

export const metadata: Metadata = {
  title: "Analysen · Combinvest",
  description: "Alle laufenden und abgeschlossenen Analysen im Überblick – suchen und filtern.",
}

export default async function AnalysenPage() {
  const advisor = await getCurrentAdvisor()
  if (!advisor) return null

  const { customers, analyses } = await getDashboardData(advisor.id)
  const customerById = new Map(customers.map((c) => [c.id, c]))

  const items: AnalysisListItem[] = analyses.map((a) => {
    const c = customerById.get(a.customer_id)
    return {
      id: a.id,
      customerId: a.customer_id,
      customerFirst: c?.first_name ?? null,
      customerLast: c?.last_name ?? null,
      status: a.status,
      currentStep: a.current_step,
      progress: Number(a.progress_percent ?? 0),
      updatedAt: a.updated_at,
    }
  })

  const openCount = analyses.filter((a) => a.status === "draft" || a.status === "in_progress").length

  return (
    <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      <div className="mb-6">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">Beratung</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">Analysen</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {analyses.length} {analyses.length === 1 ? "Analyse" : "Analysen"} insgesamt · {openCount} offen.
        </p>
      </div>

      <AnalysesList analyses={items} />
    </main>
  )
}

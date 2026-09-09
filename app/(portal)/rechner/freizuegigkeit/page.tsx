import type { Metadata } from "next"
import { CalcShell } from "@/components/portal/rechner/calc-shell"
import { FreizuegigkeitForm } from "@/components/portal/rechner/freizuegigkeit-form"
import { getAnalysis, getCalculatorSnapshot } from "@/lib/data/portal"

export const metadata: Metadata = {
  title: "Freizügigkeitskonto anfragen · Combinvest",
  description: "Bereiten Sie den Freizügigkeitsauftrag strukturiert vor – Grund, Lösung, Guthaben und Priorität in einer Übersicht.",
}

export default async function FreizuegigkeitPage({
  searchParams,
}: {
  searchParams: Promise<{ aid?: string; cid?: string }>
}) {
  const sp = await searchParams
  const ctx = { analysisId: sp.aid, customerId: sp.cid }
  const analysis = sp.aid ? await getAnalysis(sp.aid) : null
  return (
    <CalcShell
      eyebrow="Vermögen · Freizügigkeit"
      title="Freizügigkeitskonto anfragen"
      lead="Bereiten Sie den Auftrag dort vor, wo er fachlich hingehört: beim Vermögensaufbau. Der Entwurf wird mit der Kundenanalyse gespeichert."
      backHref="/rechner"
      backLabel="Rechner"
      analysisId={sp.aid}
      chip="Auftragsentwurf"
    >
      <FreizuegigkeitForm ctx={ctx} saved={getCalculatorSnapshot(analysis, "freizuegigkeit")} />
    </CalcShell>
  )
}

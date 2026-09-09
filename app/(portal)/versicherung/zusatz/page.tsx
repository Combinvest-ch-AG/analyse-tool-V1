import type { Metadata } from "next"
import { CalcShell } from "@/components/portal/rechner/calc-shell"
import { ZusatzCheck } from "@/components/portal/versicherung/zusatz-check"
import { getAnalysis, getCalculatorSnapshot } from "@/lib/data/portal"

export const metadata: Metadata = {
  title: "Zusatzversicherungs-Check · Combinvest",
  description: "Persönlichen Bedarf für ambulante und stationäre Krankenzusatzversicherungen strukturiert erfassen.",
}

export default async function ZusatzPage({
  searchParams,
}: {
  searchParams: Promise<{ aid?: string; cid?: string }>
}) {
  const sp = await searchParams
  const ctx = { analysisId: sp.aid, customerId: sp.cid }
  const analysis = sp.aid ? await getAnalysis(sp.aid) : null
  const back = sp.aid ? `/versicherung/uebersicht?aid=${sp.aid}&cid=${sp.cid ?? ""}` : "/versicherung/uebersicht"
  return (
    <CalcShell
      eyebrow="Krankenzusatzversicherung"
      title="Welche Ergänzungen sind Ihnen wichtig?"
      lead="Wählen Sie nur Leistungen, die zu Ihrer persönlichen Situation passen. Über das Info-Symbol sehen Sie, was die jeweilige Deckung ergänzt."
      backHref={back}
      backLabel="Versicherungsübersicht"
      chip="Bedarfsanalyse"
      source="Zusatzversicherungen sind freiwillige Verträge nach VVG; Leistungsumfang und Bedingungen unterscheiden sich je Versicherer."
    >
      <ZusatzCheck ctx={ctx} saved={getCalculatorSnapshot(analysis, "supplementaryInsurance")} />
    </CalcShell>
  )
}

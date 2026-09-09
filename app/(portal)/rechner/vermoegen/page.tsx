import type { Metadata } from "next"
import { CalcShell } from "@/components/portal/rechner/calc-shell"
import { VermoegenCalc, type WealthMode } from "@/components/portal/rechner/vermoegen-calc"
import { getAnalysis, getCalculatorSnapshot } from "@/lib/data/portal"

export const metadata: Metadata = {
  title: "Vermögensrechner · Combinvest",
  description: "Spar-, Zins-, Inflations-, Kosten- und Steuerrechner rund um Vermögensaufbau und Vorsorge.",
}

const VALID: WealthMode[] = ["sparen", "zins", "start", "inflation", "kosten", "ziel", "3a", "steuer"]

export default async function VermoegenPage({
  searchParams,
}: {
  searchParams: Promise<{ tool?: string; aid?: string; cid?: string }>
}) {
  const sp = await searchParams
  const mode: WealthMode = VALID.includes(sp.tool as WealthMode) ? (sp.tool as WealthMode) : "sparen"
  const ctx = { analysisId: sp.aid, customerId: sp.cid }
  const analysis = sp.aid ? await getAnalysis(sp.aid) : null
  return (
    <CalcShell
      eyebrow="Vermögen & Vorsorge"
      title="Vermögensrechner"
      lead="Acht Werkzeuge rund um Vermögensaufbau, Zinseszins, Inflation, Kosten und Steuern – wählen Sie oben das passende."
      backHref="/rechner"
      backLabel="Rechner"
      analysisId={sp.aid}
      chip="8 Werkzeuge"
      explain="Das Diagramm trennt Einzahlungen und Entwicklung. Jeder Jahreswert kann direkt abgelesen werden."
      source="Effektive Jahresrendite, monatliche Verzinsung, Beiträge am Monatsende; Renditen, Inflation und Steuersätze sind Annahmen."
    >
      <VermoegenCalc mode={mode} ctx={ctx} saved={getCalculatorSnapshot(analysis, `wealth-${mode}`)} />
    </CalcShell>
  )
}

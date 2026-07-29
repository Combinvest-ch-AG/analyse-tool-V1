import { CalcShell } from "@/components/portal/rechner/calc-shell"
import { PensionGapCalc } from "@/components/portal/rechner/pension-gap-calc"
import { getAnalysis } from "@/lib/data/portal"
import type { WizardAnswers } from "@/lib/wizard/schema"

export const metadata = {
  title: "Vorsorgelückenanalyse · Combinvest",
}

export default async function VorsorgePage({
  searchParams,
}: {
  searchParams: Promise<{ salary?: string; age?: string; children?: string; aid?: string; cid?: string }>
}) {
  const sp = await searchParams
  const analysis = sp.aid ? await getAnalysis(sp.aid) : null
  const snapshot = (analysis?.latest_snapshot ?? {}) as { answers?: WizardAnswers }
  const answers = snapshot.answers ?? {}
  const salary = Number(sp.salary) || Number(answers.brutto) || undefined
  const age = Number(sp.age) || Number(answers.alter) || undefined
  const children = sp.children != null ? Math.max(0, Number(sp.children) || 0) : Math.max(0, Number(answers.kinder_anzahl) || 0)
  const ctx = { analysisId: sp.aid, customerId: sp.cid }
  return (
    <CalcShell
      eyebrow="Vorsorge"
      title="Vorsorgelückenanalyse"
      lead="Deckungslücke bei Invalidität, Pensionierung und Todesfall — automatisch nach AHV-Skala 44 (2025/2026) und BVG-Minimum."
      backHref="/rechner"
      backLabel="Rechner"
      analysisId={sp.aid}
      chip="AHV-Skala 44"
      explain="Vorhandene Renten werden dem gewünschten Einkommen gegenübergestellt."
      source="AHV/IV, BVG, UVG sowie Ihre Ausweis- und Policenwerte."
    >
      <PensionGapCalc defaults={{ salary, age, children }} ctx={ctx} />
    </CalcShell>
  )
}

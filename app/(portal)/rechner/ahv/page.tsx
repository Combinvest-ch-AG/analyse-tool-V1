import type { Metadata } from "next"
import { CalcShell } from "@/components/portal/rechner/calc-shell"
import { AhvCalc } from "@/components/portal/rechner/ahv-calc"
import { getAnalysis } from "@/lib/data/portal"
import type { WizardAnswers } from "@/lib/wizard/schema"

export const metadata: Metadata = {
  title: "AHV-Rentenrechner · Combinvest",
  description: "Verständliche Schätzung der AHV-Altersrente auf Basis Einkommen, Beitragsjahren und Wunscheinkommen.",
}

export default async function AhvPage({
  searchParams,
}: {
  searchParams: Promise<{ aid?: string; cid?: string }>
}) {
  const sp = await searchParams
  const ctx = { analysisId: sp.aid, customerId: sp.cid }
  const analysis = sp.aid ? await getAnalysis(sp.aid) : null
  const snapshot = (analysis?.latest_snapshot ?? {}) as { answers?: WizardAnswers }
  const income = Math.max(0, Number(snapshot.answers?.brutto) || 0)
  return (
    <CalcShell
      eyebrow="1. Säule · Planungsschätzung 2026"
      title="AHV-Rente einfach verstehen"
      lead="Drei Angaben genügen für eine verständliche Schätzung: durchschnittliches Jahreseinkommen, Beitragsjahre und gewünschtes Einkommen im Ruhestand."
      backHref="/rechner"
      backLabel="Rechner"
      analysisId={sp.aid}
      chip="Skala 44"
      explain="Die geschätzte AHV-Rente wird Ihrem Wunscheinkommen gegenübergestellt."
      source="AHV-Rentenskala 44 (Stand 2026); verbindlich sind IK-Auszug und Rentenvorausberechnung."
    >
      <AhvCalc defaults={income > 0 ? { income } : undefined} ctx={ctx} />
    </CalcShell>
  )
}

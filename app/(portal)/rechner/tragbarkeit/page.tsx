import type { Metadata } from "next"
import { CalcShell } from "@/components/portal/rechner/calc-shell"
import { AffordabilityCalc } from "@/components/portal/rechner/affordability-calc"
import { getAnalysis } from "@/lib/data/portal"
import type { WizardAnswers } from "@/lib/wizard/schema"

export const metadata: Metadata = {
  title: "Tragbarkeitsrechner · Combinvest",
  description:
    "Bank-Tragbarkeit und effektive Wohnkosten: Finanzierung prüfen und Eigentum direkt mit der Miete vergleichen.",
}

export default async function TragbarkeitPage({
  searchParams,
}: {
  searchParams: Promise<{ income?: string; aid?: string; cid?: string }>
}) {
  const sp = await searchParams
  const analysis = sp.aid ? await getAnalysis(sp.aid) : null
  const snapshot = (analysis?.latest_snapshot ?? {}) as { answers?: WizardAnswers }
  const income = sp.income != null
    ? Math.max(0, Number(sp.income) || 0)
    : Math.max(0, Number(snapshot.answers?.brutto) || 0)
  const ctx = { analysisId: sp.aid, customerId: sp.cid }
  return (
    <CalcShell
      eyebrow="Wohneigentum · Tragbarkeit"
      title="Was kostet Ihr Eigenheim wirklich?"
      lead="Wählen Sie zwischen Bank-Tragbarkeit und Ihren effektiven Wohnkosten – inklusive direktem Vergleich zur Miete."
      backHref="/rechner"
      backLabel="Rechner"
      analysisId={sp.aid}
      chip="Zwei Ansichten"
      explain="Die Bankansicht prüft die Finanzierung; die effektive Ansicht vergleicht Ihre echten Kosten mit der Miete."
      source="Bankansicht nach Schweizer Finanzierungspraxis; effektive Ansicht auf Basis Ihrer Eingaben."
      wide
    >
      <AffordabilityCalc defaults={{ income }} ctx={ctx} />
    </CalcShell>
  )
}

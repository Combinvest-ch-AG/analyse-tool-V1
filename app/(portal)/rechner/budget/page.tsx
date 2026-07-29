import type { Metadata } from "next"
import { CalcShell } from "@/components/portal/rechner/calc-shell"
import { BudgetCalc } from "@/components/portal/rechner/budget-calc"
import { getAnalysis } from "@/lib/data/portal"
import type { WizardAnswers } from "@/lib/wizard/schema"

export const metadata: Metadata = {
  title: "Budgetrechner · Combinvest",
  description: "Einnahmen und Ausgaben erfassen: Geldfluss, Sparquote und monatlicher Überschuss auf einen Blick.",
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ aid?: string; cid?: string }>
}) {
  const sp = await searchParams
  const ctx = { analysisId: sp.aid, customerId: sp.cid }
  const analysis = sp.aid ? await getAnalysis(sp.aid) : null
  const snapshot = (analysis?.latest_snapshot ?? {}) as { answers?: WizardAnswers }
  const annualGrossIncome = Math.max(0, Number(snapshot.answers?.brutto) || 0)
  return (
    <CalcShell
      eyebrow="Haushalt · Einnahmen & Ausgaben"
      title="Wohin fliesst Ihr Geld?"
      lead="Erfassen Sie Einnahmen und Ausgaben – Geldfluss, Sparquote und der monatliche Überschuss aktualisieren sich in Echtzeit."
      backHref="/rechner"
      backLabel="Rechner"
      analysisId={sp.aid}
      chip="Haushaltsbudget"
      explain="Die Sparquote zeigt, welcher Anteil Ihres Einkommens monatlich übrig bleibt."
      source="Ihre erfassten monatlichen Einnahmen und Ausgaben; keine automatisch ergänzten Schätzwerte."
    >
      <BudgetCalc
        ctx={ctx}
        defaults={annualGrossIncome > 0 ? { monthlyIncome: annualGrossIncome / 12, profiledIncome: true } : undefined}
      />
    </CalcShell>
  )
}

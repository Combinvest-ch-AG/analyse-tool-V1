import type { Metadata } from "next"
import { CalcShell } from "@/components/portal/rechner/calc-shell"
import { BudgetCalc } from "@/components/portal/rechner/budget-calc"

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
      source="Ihre erfassten Einnahmen und Ausgaben; Richtwert solide Sparquote 15–20 %."
    >
      <BudgetCalc ctx={ctx} />
    </CalcShell>
  )
}

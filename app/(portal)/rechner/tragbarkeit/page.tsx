import type { Metadata } from "next"
import { CalcShell } from "@/components/portal/rechner/calc-shell"
import { AffordabilityCalc } from "@/components/portal/rechner/affordability-calc"

export const metadata: Metadata = {
  title: "Tragbarkeitsrechner · Combinvest",
  description:
    "Immobilien-Tragbarkeit nach Schweizer Standard: kalkulatorischer Zins 5 %, Nebenkosten 1 %, Limit 33.33 % des Bruttoeinkommens.",
}

export default function TragbarkeitPage() {
  return (
    <CalcShell
      eyebrow="Wohneigentum · Tragbarkeit"
      title="Können Sie sich Ihr Eigenheim leisten?"
      lead="Prüfen Sie auf einen Blick, ob Kaufpreis, Eigenkapital und Einkommen zusammenpassen — nach dem Schweizer Tragbarkeitsstandard."
      backHref="/rechner"
      backLabel="Rechner"
      chip="Schweizer Standard"
    >
      <AffordabilityCalc />
    </CalcShell>
  )
}

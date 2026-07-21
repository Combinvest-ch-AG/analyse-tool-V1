import type { Metadata } from "next"
import { CalcShell } from "@/components/portal/rechner/calc-shell"
import { FranchiseCalc } from "@/components/portal/rechner/franchise-calc"

export const metadata: Metadata = {
  title: "Franchise-Vergleich 2026 · Combinvest",
  description: "Franchise-Vergleich mit den offiziellen BAG-Prämien 2026 für den gewählten Wohnort und Versicherer.",
}

export default function FranchisePage() {
  return (
    <CalcShell
      eyebrow="Grundversicherung"
      title="Welche Franchise passt wirklich?"
      lead="Vergleichen Sie alle verfügbaren Franchisen mit der exakten Prämie Ihres Wohnorts, Versicherers und Modells."
      backHref="/rechner"
      backLabel="Rechner"
      chip="BAG-Prämien 2026"
    >
      <FranchiseCalc />
    </CalcShell>
  )
}

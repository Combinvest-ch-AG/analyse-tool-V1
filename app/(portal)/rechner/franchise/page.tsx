import type { Metadata } from "next"
import { CalcShell } from "@/components/portal/rechner/calc-shell"
import { FranchiseCalc } from "@/components/portal/rechner/franchise-calc"

export const metadata: Metadata = {
  title: "Franchise-Vergleich 2026 · Combinvest",
  description: "Franchise-Vergleich mit den offiziellen BAG-Prämien 2026 für den gewählten Wohnort und Versicherer.",
}

export default async function FranchisePage({
  searchParams,
}: {
  searchParams: Promise<{ plz?: string; birthYear?: string; aid?: string; cid?: string }>
}) {
  const sp = await searchParams
  const ctx = { analysisId: sp.aid, customerId: sp.cid }
  return (
    <CalcShell
      eyebrow="Grundversicherung"
      title="Welche Franchise passt wirklich?"
      lead="Vergleichen Sie alle verfügbaren Franchisen mit der exakten Prämie Ihres Wohnorts, Versicherers und Modells."
      backHref="/rechner"
      backLabel="Rechner"
      analysisId={sp.aid}
      chip="BAG-Prämien 2026"
      explain="Sie sehen Prämie und Kostenbeteiligung je Franchise getrennt."
      source="BAG / opendata.swiss, Prämien 2026; exakte Auswahl über Priminfo."
    >
      <FranchiseCalc defaults={{ plz: sp.plz, birthYear: sp.birthYear }} ctx={ctx} />
    </CalcShell>
  )
}

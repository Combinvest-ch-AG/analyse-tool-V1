import type { Metadata } from "next"
import { CalcShell } from "@/components/portal/rechner/calc-shell"
import { TaxSuite } from "@/components/portal/rechner/tax-suite"
import { getAnalysis, getCalculatorSnapshot, getCustomerById } from "@/lib/data/portal"
import { searchTaxLocations } from "@/lib/tax/estv"
import { buildTaxPrefill } from "@/lib/tax/prefill"

export const metadata: Metadata = {
  title: "Schweizer Steuerrechner · Combinvest",
  description: "Einkommenssteuer, Säule 3a und Kapitalleistungen mit aktuellen ESTV-Daten berechnen.",
}

export default async function TaxPage({
  searchParams,
}: {
  searchParams: Promise<{ aid?: string; cid?: string; tool?: string }>
}) {
  const sp = await searchParams
  const [analysis, customer] = await Promise.all([
    sp.aid ? getAnalysis(sp.aid) : Promise.resolve(null),
    sp.cid ? getCustomerById(sp.cid) : Promise.resolve(null),
  ])
  const effectiveCustomer = analysis
    ? customer?.id === analysis.customer_id
      ? customer
      : await getCustomerById(analysis.customer_id)
    : customer
  const initialMode = sp.tool === "3a" ? "pillar3a" : sp.tool === "capital" ? "capital" : sp.tool === "property" ? "property" : "income"
  const key = `tax-${initialMode}`
  const prefill = buildTaxPrefill(effectiveCustomer, analysis)
  let initialLocation
  if (prefill.locationQuery?.value) {
    try {
      const matches = await searchTaxLocations(prefill.locationQuery.value)
      const postcode = effectiveCustomer?.postcode
      initialLocation = matches.find((item) => postcode && item.ZipCode === postcode) ?? matches[0]
    } catch {
      // The calculator remains usable with its neutral default when the live
      // location lookup is temporarily unavailable.
    }
  }
  return (
    <CalcShell
      eyebrow="Steuern · Schweiz"
      title="Steuern in Franken berechnen"
      lead="Wohnort und persönliche Situation erfassen – Bund, Kanton und Gemeinde werden mit den aktuellen ESTV-Grundlagen berechnet."
      backHref="/rechner"
      backLabel="Rechner"
      analysisId={sp.aid}
      chip="Steuerjahr 2026"
      explain="Das Ergebnis zeigt die Steuerbelastung transparent nach Bund, Kanton und Gemeinde. Es ersetzt keine definitive Steuerveranlagung."
      source="Offizieller Steuerrechner der Eidgenössischen Steuerverwaltung (ESTV), Steuerjahr 2026."
      wide
    >
      <TaxSuite
        ctx={{ analysisId: sp.aid, customerId: sp.cid }}
        initialMode={initialMode}
        prefill={prefill}
        initialLocation={initialLocation}
        saved={getCalculatorSnapshot(analysis, key)}
      />
    </CalcShell>
  )
}

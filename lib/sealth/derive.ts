import {
  contractAnnualAmount,
  contractMonthlyAmount,
  type Contracts,
  type WizardAnswers,
} from "@/lib/wizard/schema"

export type SealthPlanKey = "coach" | "tax" | "protect" | "sealth" | "premium"

export type SealthDerivation = {
  scores: { wealth: number; health: number; self: number; legal: number }
  recommended: SealthPlanKey
  reasons: string[]
  hasRechtsschutz: boolean
  sportLevel: 0 | 2 | 4
  taxPref: "sparen" | "profi" | "selbst" | null
  prefill: { tax: number; fitnessMonthly: number; legal: number }
}

/** Finds the first captured contract for a given product base id (keys may be suffixed). */
function findContract(contracts: Contracts | undefined, product: string) {
  if (!contracts) return undefined
  return Object.values(contracts).find((c) => c?.product === product)
}

/**
 * Sealth-Empfehlung ohne eigenen Fragebogen: leitet die fünf Dimensionen synchron
 * aus dem Profiling (Sport, Steuerpräferenz, Liquidität) und dem Vertragscheck
 * (Rechtsschutz, Fitnessabo) ab. SSOT für Board-Karte und /sealth-Ergebnisseite.
 */
export function deriveSealth(answers: WizardAnswers | undefined, contracts: Contracts | undefined): SealthDerivation {
  const sport = typeof answers?.sport === "string" ? answers.sport : ""
  const sportLevel: 0 | 2 | 4 = sport === "regelmaessig" ? 4 : sport === "gelegentlich" ? 2 : 0

  // Mehrfachauswahl: höchste Service-Stufe gewinnt (profi > sparen > selbst/eigenständig).
  const taxSel = Array.isArray(answers?.steuererklaerung)
    ? (answers?.steuererklaerung as string[])
    : typeof answers?.steuererklaerung === "string" && answers.steuererklaerung
      ? [answers.steuererklaerung]
      : []
  const taxPref: "sparen" | "profi" | "selbst" | null = taxSel.includes("profi")
    ? "profi"
    : taxSel.includes("sparen")
      ? "sparen"
      : taxSel.includes("selbst") || taxSel.includes("eigenstaendig")
        ? "selbst"
        : null

  const rechtsschutz = findContract(contracts, "Rechtsschutz")
  const hasRechtsschutz = Boolean(rechtsschutz)
  const fitness = findContract(contracts, "Fitnessabo")

  const liquid = typeof answers?.liquiditaet === "string" ? answers.liquiditaet : ""
  const liquidHigh = liquid === "100bis250" || liquid === "ueber250"

  // Dimensionen (Anzeige-Skala je max unterschiedlich – siehe Ergebnisseite).
  const wealth = (taxPref === "profi" ? 4 : taxPref === "sparen" ? 2 : 0) + (liquidHigh ? 2 : 0)
  const health = sportLevel
  const legal = hasRechtsschutz ? 4 : 2
  const self = 0

  // Empfehlung – Reihenfolge nach Priorität.
  let recommended: SealthPlanKey
  if (sportLevel >= 4 && hasRechtsschutz) recommended = "premium"
  else if (sportLevel >= 4) recommended = "sealth"
  else if (hasRechtsschutz) recommended = "protect"
  else if (taxPref === "profi" || taxPref === "sparen") recommended = "tax"
  else if (sportLevel >= 2) recommended = "coach"
  else recommended = "coach"

  const reasons: string[] = []
  if (sportLevel === 4) reasons.push("Regelmässig sportlich aktiv – Health-Leistungen (Fitpass) lohnen sich.")
  else if (sportLevel === 2) reasons.push("Gelegentlich sportlich aktiv – Basis-Fitness ist ein Plus.")
  if (hasRechtsschutz) reasons.push("Rechtsschutz im Vertragscheck erfasst – Protect passt zum bestehenden Bedarf.")
  else reasons.push("Kein Rechtsschutz erfasst – Protect kann diese Lücke schliessen.")
  if (taxPref === "profi") reasons.push("Steuererklärung soll komplett von Experten erledigt werden.")
  else if (taxPref === "sparen") reasons.push("Fokus auf Steueroptimierung – Tax Assist holt das Maximum heraus.")
  else if (taxPref === "selbst") reasons.push("Steuererklärung wird selbst erledigt – digitale Anleitung genügt.")

  return {
    scores: { wealth, health, self, legal },
    recommended,
    reasons,
    hasRechtsschutz,
    sportLevel,
    taxPref,
    prefill: {
      tax: 250,
      fitnessMonthly: fitness ? Math.round(contractMonthlyAmount(fitness)) || 90 : 90,
      legal: rechtsschutz ? Math.round(contractAnnualAmount(rechtsschutz)) || 300 : 300,
    },
  }
}

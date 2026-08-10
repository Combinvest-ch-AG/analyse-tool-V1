import type { AnalysisRow, CustomerRow } from "../data/portal.ts"
import { contractAnnualAmount, type Contract, type Contracts, type WizardAnswers } from "../wizard/schema.ts"

export type TaxPrefillSource = "Kundenprofil" | "Profiling" | "Vertragscheck" | "Rechner"

export type TaxPrefillValue<T> = {
  value: T
  source: TaxPrefillSource
}

export type TaxPrefill = {
  locationQuery?: TaxPrefillValue<string>
  relationship?: TaxPrefillValue<1 | 2 | 3 | 4>
  confession1?: TaxPrefillValue<1 | 2 | 3 | 4 | 5>
  children?: TaxPrefillValue<number[]>
  age1?: TaxPrefillValue<number>
  gender?: TaxPrefillValue<1 | 2>
  revenueType1?: TaxPrefillValue<1 | 2 | 3 | 4>
  grossIncome1?: TaxPrefillValue<number>
  fortune?: TaxPrefillValue<number>
  pillar3aContribution?: TaxPrefillValue<number>
  hasPensionFund?: TaxPrefillValue<boolean>
}

type AnalysisSnapshot = {
  answers?: WizardAnswers
  contracts?: Contracts
  calculatorResults?: Record<string, { inputs?: Record<string, unknown> }>
}

function positiveNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : undefined
}

function ageAt(date: string | null, now = new Date()) {
  if (!date) return undefined
  const birthdate = new Date(`${date}T12:00:00`)
  if (Number.isNaN(birthdate.getTime())) return undefined
  let age = now.getFullYear() - birthdate.getFullYear()
  const birthdayPassed = now.getMonth() > birthdate.getMonth() ||
    (now.getMonth() === birthdate.getMonth() && now.getDate() >= birthdate.getDate())
  if (!birthdayPassed) age -= 1
  return age >= 0 && age <= 100 ? age : undefined
}

function relationship(value: unknown): 1 | 2 | 3 | 4 | undefined {
  const normalized = String(value ?? "").toLowerCase()
  if (normalized === "verheiratet") return 2
  if (normalized === "konkubinat") return 3
  if (normalized === "eingetragene_partnerschaft") return 4
  if (["ledig", "geschieden", "verwitwet"].includes(normalized)) return 1
  return undefined
}

function confession(value: unknown): 1 | 2 | 3 | 4 | 5 | undefined {
  const normalized = String(value ?? "").toLowerCase()
  if (normalized === "reformiert") return 1
  if (normalized === "katholisch") return 2
  if (normalized === "christkatholisch") return 3
  if (normalized === "keine") return 4
  if (normalized === "andere") return 5
  return undefined
}

function revenueType(value: unknown): 1 | 2 | 3 | 4 | undefined {
  const normalized = String(value ?? "").toLowerCase()
  if (["angestellt", "lehrling"].includes(normalized)) return 1
  if (normalized === "selbstaendig") return 2
  if (normalized === "pensioniert") return 3
  if (["student", "keine"].includes(normalized)) return 4
  return undefined
}

function childrenAges(answers: WizardAnswers) {
  const raw = answers.kinder_alter
  if (Array.isArray(raw)) {
    return raw.map(Number).filter((age) => Number.isFinite(age) && age >= 0 && age <= 100)
  }
  const count = Math.min(10, Math.max(0, Number(answers.kinder_anzahl) || 0))
  if (count === 0) return []
  if (typeof raw === "string") {
    const parsed = raw.split(/[,;\s]+/).map(Number).filter((age) => Number.isFinite(age) && age >= 0 && age <= 100)
    return parsed.slice(0, count)
  }
  // The child's age changes the official deduction. We therefore never
  // invent placeholder ages merely to match the recorded number of children.
  return []
}

function exactFortune(snapshot: AnalysisSnapshot) {
  const budget = snapshot.calculatorResults?.budget?.inputs?.data
  if (!budget || typeof budget !== "object" || Array.isArray(budget)) return undefined
  const value = positiveNumber((budget as Record<string, unknown>).taxableFortune)
  return value
}

function pillar3aContribution(contracts: Contracts | undefined) {
  if (!contracts) return undefined
  const total = Object.values(contracts).reduce((sum, contract: Contract) => {
    const product = String(contract.product ?? "").trim().toLowerCase()
    // Only the unambiguous bank 3a product is transferred automatically.
    // A generic life-insurance premium may include risk costs and is therefore
    // not treated as a deductible 3a contribution without explicit evidence.
    return product === "vorsorgebank 3a" ? sum + contractAnnualAmount(contract) : sum
  }, 0)
  return total > 0 ? Math.round(total * 100) / 100 : undefined
}

export function buildTaxPrefill(customer: CustomerRow | null, analysis: AnalysisRow | null): TaxPrefill {
  const snapshot = (analysis?.latest_snapshot ?? {}) as AnalysisSnapshot
  const answers = snapshot.answers ?? {}
  const result: TaxPrefill = {}

  const locationQuery = [customer?.postcode, customer?.city].filter(Boolean).join(" ").trim() ||
    [answers.plz, answers.ort].filter(Boolean).join(" ").trim()
  if (locationQuery) result.locationQuery = { value: locationQuery, source: customer?.postcode || customer?.city ? "Kundenprofil" : "Profiling" }

  const mappedRelationship = relationship(answers.zivilstand)
  if (mappedRelationship) result.relationship = { value: mappedRelationship, source: "Profiling" }

  const mappedConfession = confession(answers.konfession)
  if (mappedConfession) result.confession1 = { value: mappedConfession, source: "Profiling" }

  if (answers.kinder === "ja" || positiveNumber(answers.kinder_anzahl)) {
    result.children = { value: childrenAges(answers), source: "Profiling" }
  } else if (answers.kinder === "nein") {
    result.children = { value: [], source: "Profiling" }
  }

  const customerAge = ageAt(customer?.birthdate ?? null)
  const profileAge = positiveNumber(answers.alter)
  const age = customerAge ?? profileAge
  if (age) result.age1 = { value: Math.round(age), source: customerAge ? "Kundenprofil" : "Profiling" }

  const gender = String(customer?.gender ?? answers.geschlecht ?? "").toLowerCase()
  if (["w", "weiblich", "female", "frau"].includes(gender)) result.gender = { value: 2, source: customer?.gender ? "Kundenprofil" : "Profiling" }
  else if (["m", "männlich", "maennlich", "male", "mann"].includes(gender)) result.gender = { value: 1, source: customer?.gender ? "Kundenprofil" : "Profiling" }

  const mappedRevenue = revenueType(answers.erwerb)
  if (mappedRevenue) result.revenueType1 = { value: mappedRevenue, source: "Profiling" }

  const annualIncome = positiveNumber(answers.brutto) ??
    (positiveNumber(customer?.monthly_income) ? Number(customer?.monthly_income) * 12 : undefined)
  if (annualIncome) result.grossIncome1 = { value: annualIncome, source: positiveNumber(answers.brutto) ? "Profiling" : "Kundenprofil" }

  const fortune = exactFortune(snapshot)
  if (fortune) result.fortune = { value: fortune, source: "Rechner" }

  const contribution = pillar3aContribution(snapshot.contracts)
  if (contribution) result.pillar3aContribution = { value: contribution, source: "Vertragscheck" }

  if (mappedRevenue === 2) result.hasPensionFund = { value: false, source: "Profiling" }
  else if (mappedRevenue === 1) result.hasPensionFund = { value: true, source: "Profiling" }

  return result
}

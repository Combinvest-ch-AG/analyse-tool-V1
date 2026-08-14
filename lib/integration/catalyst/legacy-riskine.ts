/**
 * Bonus-Pfad: Vorbefuellung aus einer alten Riskine-Advisory.
 *
 * Riskine benutzte flache dotted-keys mit teils *numerischen* Options-Codes
 * (z. B. `person.education.level: 3`). Diese Codes sind nirgends dokumentiert
 * und waren Indizes in Riskines eigene Optionslisten. Sie zu erraten wuerde
 * falsche Kundendaten erzeugen — deshalb gilt hier bewusst:
 *
 *   - Uebernommen werden nur *eindeutige* Werte (Datum, Betrag, Anzahl, Listen).
 *   - Undurchsichtige Enum-Codes landen in `unmapped` und werden dem Berater
 *     nicht als Antwort untergeschoben.
 *
 * Sobald echte Riskine-Exporte vorliegen, koennen die Enum-Tabellen unten
 * ergaenzt werden; die Struktur ist darauf vorbereitet.
 */

import type { WizardAnswers } from "@/lib/wizard/schema"

export type LegacyMappingResult = {
  answers: WizardAnswers
  /** Schluessel, die wir absichtlich nicht interpretiert haben. */
  unmapped: string[]
  /** Anzahl tatsaechlich uebernommener Antworten. */
  mappedCount: number
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function ageFromBirthdate(value: unknown): number | null {
  if (typeof value !== "string") return null
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return null
  const birth = new Date(parsed)
  const now = new Date()
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1
  return age >= 18 && age <= 80 ? age : null
}

/**
 * Schluessel, deren Riskine-Wert ein undokumentierter Enum-Code ist. Sie werden
 * protokolliert statt uebernommen.
 */
const OPAQUE_ENUM_KEYS = new Set([
  "person.sport.habit",
  "person.health.smoke.habit.one",
  "person.family.partner",
  "person.education.level",
  "person.work.professiontype",
  "object.home.type",
  "object.animal.type.select",
  "person.family.incomedepending",
  "person.health.health-private.preferences",
  "person.investment.financialsecurity.preferences",
  "person.investment.goals.preferences",
  "person.statebenefits.pension.professionaldevelopment",
])

/**
 * Bildet eine Riskine-Advisory auf unsere flachen Wizard-Antworten ab.
 * Bereits vorhandene Antworten werden nie ueberschrieben.
 */
export function mapLegacyRiskineInput(
  input: Record<string, unknown> | undefined,
  existing: WizardAnswers = {},
): LegacyMappingResult {
  const answers: WizardAnswers = {}
  const unmapped: string[] = []

  if (!input) return { answers, unmapped, mappedCount: 0 }

  const set = (id: string, value: string | number | string[]) => {
    // Bestehende Antworten haben Vorrang: der Berater gewinnt gegen den Import.
    if (existing[id] !== undefined && existing[id] !== null) return
    if (answers[id] !== undefined) return
    answers[id] = value
  }

  // --- Eindeutige Werte ---------------------------------------------------
  const age = ageFromBirthdate(input["person.birthdate"])
  if (age !== null) set("alter", age)

  const gross = asNumber(input["person.work.income.gross.monthly"])
  if (gross !== null && gross > 0) set("brutto", Math.round(gross))

  const children = asNumber(input["person.children"])
  if (children !== null) {
    set("kinder", children > 0 ? "ja" : "nein")
    if (children > 0) set("kinder_anzahl", Math.min(Math.round(children), 12))
  }

  const vehicles = input["object.vehicle.type.owned"]
  if (Array.isArray(vehicles)) {
    set("motorfahrzeug", vehicles.length > 0 ? "ja" : "nein")
  }

  // --- Undurchsichtige Enum-Codes: protokollieren, nicht raten ------------
  for (const key of Object.keys(input)) {
    if (OPAQUE_ENUM_KEYS.has(key) && input[key] !== null && input[key] !== undefined) {
      unmapped.push(key)
    }
  }

  return { answers, unmapped, mappedCount: Object.keys(answers).length }
}

/**
 * Zieht die Stammdaten-Anteile aus einer Riskine-Advisory. Diese sind textuell
 * und damit gefahrlos uebernehmbar. Catalyst-Kontaktdaten haben aber immer
 * Vorrang, daher liefert das hier nur Lueckenfueller.
 */
export function mapLegacyRiskineContact(input: Record<string, unknown> | undefined): {
  firstName?: string
  lastName?: string
  street?: string
  houseNumber?: string
  postcode?: string
  birthdate?: string
} {
  if (!input) return {}
  const text = (key: string): string | undefined => {
    const value = input[key]
    if (typeof value === "string" && value.trim() !== "") return value.trim()
    if (typeof value === "number") return String(value)
    return undefined
  }
  const birthdateRaw = text("person.birthdate")
  const birthdate =
    birthdateRaw && /^\d{4}-\d{2}-\d{2}/.test(birthdateRaw) ? birthdateRaw.slice(0, 10) : undefined

  return {
    firstName: text("person.name.first"),
    lastName: text("person.name.last"),
    street: text("person.address.street"),
    houseNumber: text("person.address.housenumber"),
    postcode: text("person.address.postcode"),
    birthdate,
  }
}

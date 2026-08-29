/**
 * Brutto-zu-Netto-Lohn – vereinfachtes Schweizer Modell.
 *
 * Arbeitnehmeranteile:
 *  - AHV / IV / EO: 5.3 %
 *  - ALV (Arbeitslosenversicherung): 1.1 %
 *  - BVG (Pensionskasse): altersabhängig (Hälfte des Gesamtsatzes)
 *
 * Hinweis: Bewusst vereinfacht (keine ALV-Höchstlohngrenze, kein BVG-
 * Koordinationsabzug, keine NBU-/KTG-Beiträge). Der genaue Nettolohn kann im
 * Rechner manuell überschrieben werden.
 */

export const AHV_IV_EO_RATE = 0.053
export const ALV_RATE = 0.011

export type SalaryBreakdown = {
  gross: number
  ahvIvEo: number
  alv: number
  bvg: number
  bvgRate: number
  totalDeductions: number
  net: number
}

/** BVG-Arbeitnehmeranteil nach Alter (Hälfte des gesetzlichen Gesamtsatzes). */
export function bvgEmployeeRate(age: number): number {
  const a = Math.max(0, Math.floor(Number(age) || 0))
  if (a >= 55) return 0.09
  if (a >= 45) return 0.075
  if (a >= 35) return 0.05
  if (a >= 25) return 0.035
  return 0 // 18–24: in der Regel nur Risikobeitrag, kein Sparbeitrag
}

/** Berechnet die Sozialabzüge und den Nettolohn aus einem (Monats-)Bruttolohn. */
export function computeNetSalary(gross: number, age: number): SalaryBreakdown {
  const g = Math.max(0, Number(gross) || 0)
  const rate = bvgEmployeeRate(age)
  const ahvIvEo = g * AHV_IV_EO_RATE
  const alv = g * ALV_RATE
  const bvg = g * rate
  const totalDeductions = ahvIvEo + alv + bvg
  return {
    gross: g,
    ahvIvEo,
    alv,
    bvg,
    bvgRate: rate,
    totalDeductions,
    net: Math.max(0, g - totalDeductions),
  }
}

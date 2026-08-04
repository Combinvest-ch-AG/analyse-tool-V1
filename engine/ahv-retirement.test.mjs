import assert from "node:assert/strict"
import test from "node:test"
import { ahvScale44, calculateAhvRetirement } from "../lib/engine/ahv-retirement.ts"

test("Skala 44 hält die offiziellen Rentengrenzen 2026 ein", () => {
  assert.equal(ahvScale44(15_120).monthly, 1_260)
  assert.equal(ahvScale44(90_720).monthly, 2_520)
})

test("fehlende Beitragsjahre reduzieren den Planungswert proportional", () => {
  const full = calculateAhvRetirement({ averageIncome: 90_720, contributionYears: 44, desiredMonthlyIncome: 5_000 })
  const partial = calculateAhvRetirement({ averageIncome: 90_720, contributionYears: 22, desiredMonthlyIncome: 5_000 })
  assert.equal(full.ordinaryMonthly, 2_520)
  assert.equal(partial.ordinaryMonthly, 1_260)
})

test("Jahresplanung 2026 enthält die 13. Altersrente", () => {
  const result = calculateAhvRetirement({ averageIncome: 90_720, contributionYears: 44, desiredMonthlyIncome: 5_000 })
  assert.equal(result.annualIncluding13th, 2_520 * 13)
  assert.equal(result.monthlyEquivalent, (2_520 * 13) / 12)
})

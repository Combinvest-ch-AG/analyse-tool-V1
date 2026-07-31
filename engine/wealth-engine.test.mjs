import assert from "node:assert/strict"
import test from "node:test"
import {
  annualToMonthlyRate,
  futureValue,
  monthsToTarget,
  netReturnAfterCosts,
  purchasingPower,
  requiredMonthlySavings,
} from "../lib/engine/wealth.ts"

test("5 % effektive Jahresrendite kompoundiert nach 12 Monaten exakt auf 5 %", () => {
  const monthly = annualToMonthlyRate(5)
  assert.ok(Math.abs(Math.pow(1 + monthly, 12) - 1.05) < 1e-12)
})

test("Zinseszins ohne Sparrate entspricht der jährlichen Aufzinsung", () => {
  assert.ok(Math.abs(futureValue({ capital: 20_000, monthly: 0, years: 25, annualRatePct: 5 }) - 20_000 * 1.05 ** 25) < 0.01)
})

test("Sparzielrate erreicht das Ziel mit derselben Zahlungslogik", () => {
  const monthly = requiredMonthlySavings({ capital: 20_000, target: 500_000, years: 25, annualRatePct: 5 })
  const end = futureValue({ capital: 20_000, monthly, years: 25, annualRatePct: 5 })
  assert.ok(Math.abs(end - 500_000) < 0.01)
})

test("Zielvermögen liefert den ersten Monat, in dem das Ziel erreicht wird", () => {
  const months = monthsToTarget({
    capital: 20_000,
    monthly: 800,
    target: 1_000_000,
    annualRatePct: 8,
  })
  assert.ok(Number.isFinite(months))
  assert.ok(months > 300 && months < 360)
  assert.ok(futureValue({ capital: 20_000, monthly: 800, years: months / 12, annualRatePct: 8 }) >= 1_000_000)
  assert.ok(futureValue({ capital: 20_000, monthly: 800, years: (months - 1) / 12, annualRatePct: 8 }) < 1_000_000)
})

test("Zielvermögen meldet ein unerreichbares Ziel ohne Kapital und Sparrate", () => {
  assert.equal(
    monthsToTarget({ capital: 0, monthly: 0, target: 500_000, annualRatePct: 5 }),
    Number.POSITIVE_INFINITY,
  )
})

test("Kaufkraft und Kostenrendite bleiben mathematisch konsistent", () => {
  assert.ok(Math.abs(purchasingPower(100_000, 10, 2) - 100_000 / 1.02 ** 10) < 0.01)
  assert.ok(netReturnAfterCosts(5, 1) < 5)
  assert.ok(netReturnAfterCosts(5, 1) > 3.9)
})

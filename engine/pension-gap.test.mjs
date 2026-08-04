import assert from "node:assert/strict"
import test from "node:test"
import {
  calculateAhvIv,
  calculateAhvRetirementGap,
  estimateBvg,
  resolveValues,
} from "../lib/engine/pension-gap.ts"

const BASE = {
  risk: "iv",
  salary: 100_000,
  targetPct: 90,
  cause: "illness",
  degree: 100,
  ahvMode: "scale44",
  averageIncome: 90_720,
  contributionGaps: 0,
  children: 0,
  bvgMode: "minimum",
  age: 40,
  startAge: 25,
}

test("AHV/IV und Altersrente verwenden Skala 44 und Beitragslücken", () => {
  assert.equal(calculateAhvIv(BASE).annual, 30_240)
  assert.equal(calculateAhvRetirementGap(BASE).annual, 32_760)

  const partial = { ...BASE, contributionGaps: 22 }
  assert.equal(calculateAhvIv(partial).annual, 15_120)
  assert.equal(calculateAhvRetirementGap(partial).annual, 16_380)
})

test("BVG-Minimum verwendet die offiziellen Grenzbeträge 2025/2026", () => {
  const result = estimateBvg(BASE)
  assert.equal(result.coordinated, 90_720 - 26_460)
  assert.ok(result.iv > 0)
  assert.ok(result.retirement > 0)
})

test("automatische Werte sind beim Öffnen aus Einkommen und BVG-Minimum vorhanden", () => {
  const result = resolveValues(BASE, { iv: {}, retirement: {}, death: {} })
  assert.equal(result.values.iv.ahv, 30_240)
  assert.equal(result.values.retirement.ahv, 32_760)
  assert.ok((result.values.iv.bvg ?? 0) > 0)
  assert.ok((result.values.retirement.bvg ?? 0) > 0)
})

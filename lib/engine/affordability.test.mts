// Runs against the SAME module the app ships (./affordability.ts) — no duplicate copy.
import test from "node:test"
import assert from "node:assert/strict"
import { affordability, maxAffordable, RULES } from "./affordability.ts"

const approx = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) <= eps * Math.max(1, Math.abs(b))

test("classic case 1M value / 200k equity / 150k income is not affordable", () => {
  const r = affordability({ wert: 1_000_000, eigenkapital: 200_000, bruttoeinkommenJahr: 150_000 })
  assert.equal(r.hypothek, 800_000)
  assert.ok(approx(r.belehnung, 80))
  assert.ok(approx(r.zinslast, 40_000)) // 5% of 800k
  assert.ok(approx(r.nebenkosten, 10_000)) // 1% of 1M
  assert.ok(approx(r.zweiteHyp, 800_000 - (1_000_000 * RULES.ersteHypGrenze) / 100))
  assert.ok(approx(r.amortisation, r.zweiteHyp / 15))
  assert.ok(r.quote > RULES.tragbarkeitsLimit)
  assert.equal(r.tragbar, false)
})

test("same property becomes affordable at 200k income", () => {
  const r = affordability({ wert: 1_000_000, eigenkapital: 200_000, bruttoeinkommenJahr: 200_000 })
  assert.ok(r.quote < 30)
  assert.equal(r.tragbar, true)
})

test("maxAffordable respects the affordability limit and stays within equity bound", () => {
  const mx = maxAffordable(150_000, 200_000)
  const r = affordability({ wert: mx, eigenkapital: 200_000, bruttoeinkommenJahr: 150_000 })
  assert.ok(r.quote <= RULES.tragbarkeitsLimit + 0.01)
  assert.ok(mx > 0 && mx <= 1_000_000 + 1)
})

test("engine is deterministic", () => {
  const args = { wert: 800_000, eigenkapital: 200_000, bruttoeinkommenJahr: 120_000 }
  assert.equal(affordability(args).quote, affordability(args).quote)
})

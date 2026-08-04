// Runs against the SAME module the app ships (./pension.ts) — no duplicate copy.
import test from "node:test"
import assert from "node:assert/strict"
import { accumulate, monthlyRate, planRetirement, requiredCapital } from "./pension.ts"

const approx = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) <= eps * Math.max(1, Math.abs(b))

const baseInput = {
  start: 20_000,
  withdrawalMonth: 2_000,
  decRatePct: 2.0,
  decYears: 25,
  accRatePct: 3.0,
  dynamikPct: 1.0,
  accYears: 30,
  freq: "m" as const,
}

test("planRetirement is deterministic", () => {
  const a = planRetirement(baseInput)
  const b = planRetirement(baseInput)
  assert.equal(a.requiredSavings, b.requiredSavings)
  assert.equal(a.targetCapital, b.targetCapital)
})

test("required capital (present value of annuity) is plausible", () => {
  const need = requiredCapital({ withdrawalMonth: 2_000, annualRatePct: 2.0, years: 25 })
  assert.ok(need > 400_000)
  assert.ok(need < 2_000 * 12 * 25) // less than the undiscounted sum
})

test("solved savings rate actually reaches the target capital", () => {
  const plan = planRetirement(baseInput)
  const reached = accumulate({
    start: baseInput.start,
    monthly: plan.requiredSavings,
    annualRatePct: baseInput.accRatePct,
    dynamikPct: baseInput.dynamikPct,
    years: baseInput.accYears,
    freq: "m",
  }).endCapital
  assert.ok(approx(reached, plan.targetCapital, 1e-4))
})

test("monthlyRate basics: zero maps to zero and compounds to the annual rate", () => {
  assert.equal(monthlyRate(0), 0)
  assert.ok(approx(Math.pow(1 + monthlyRate(3), 12), 1.03, 1e-9))
})

test("if starting capital already covers the target, savings rate is zero", () => {
  const plan = planRetirement({ ...baseInput, start: 1e9 })
  assert.equal(plan.requiredSavings, 0)
})

test("capital peaks at retirement and the decumulation curve ends near zero", () => {
  const plan = planRetirement(baseInput)
  const capAtPeak = plan.series.find((p) => Math.abs(p.t - baseInput.accYears) < 0.01)?.cap
  assert.ok(capAtPeak !== undefined && capAtPeak > 0)
  assert.ok(plan.series[plan.series.length - 1].cap < 1000)
})

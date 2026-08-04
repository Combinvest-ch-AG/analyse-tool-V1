// Regression net for the Vorsorgelücken-Engine (previously untested).
// All expected values are derived directly from the engine's documented formulas.
import test from "node:test"
import assert from "node:assert/strict"
import {
  ahvScale44,
  bvgCreditRate,
  bvgIvShare,
  calculateAhvIv,
  computeGap,
  estimateBvg,
  type GapInputs,
  type ValuesByRisk,
} from "./pension-gap.ts"

const baseInput: GapInputs = {
  risk: "iv",
  salary: 100_000,
  targetPct: 90,
  cause: "illness",
  degree: 60,
  ahvMode: "scale44",
  averageIncome: 100_000,
  contributionGaps: 0,
  children: 0,
  bvgMode: "minimum",
  age: 40,
  startAge: 25,
}

test("BVG credit rate follows the statutory age bands", () => {
  assert.equal(bvgCreditRate(34), 0.07)
  assert.equal(bvgCreditRate(35), 0.1)
  assert.equal(bvgCreditRate(44), 0.1)
  assert.equal(bvgCreditRate(45), 0.15)
  assert.equal(bvgCreditRate(54), 0.15)
  assert.equal(bvgCreditRate(55), 0.18)
})

test("BVG/IV share is zero below 40%, ramps to 50%, then linear, capped at 100%", () => {
  assert.equal(bvgIvShare(39), 0)
  assert.equal(bvgIvShare(40), 0.25)
  assert.equal(bvgIvShare(45), 0.375)
  assert.equal(bvgIvShare(50), 0.5)
  assert.equal(bvgIvShare(69), 0.69)
  assert.equal(bvgIvShare(70), 1)
  assert.equal(bvgIvShare(100), 1)
})

test("AHV scale 44 clamps income and monthly pension to statutory bounds", () => {
  assert.equal(ahvScale44(0).usedIncome, 15_120) // income floored
  assert.equal(ahvScale44(0).monthly, 1_260) // minimum pension
  assert.equal(ahvScale44(1_000_000).usedIncome, 90_720) // income capped
  assert.equal(ahvScale44(1_000_000).monthly, 2_520) // maximum pension
  assert.equal(ahvScale44(45_360).usedIncome, 45_360) // exact step boundary
})

test("calculateAhvIv scales by disability degree and is deterministic", () => {
  const r = calculateAhvIv(baseInput)
  // full monthly 2520 (income capped), scale 44/44, share 0.6 -> 2520*12*0.6 = 18144
  assert.equal(r.annual, 18_144)
  assert.equal(r.possible, true)
  assert.deepEqual(calculateAhvIv(baseInput), r) // determinism

  // below 40% disability -> no IV pension
  assert.equal(calculateAhvIv({ ...baseInput, degree: 30 }).annual, 0)
})

test("contribution gaps reduce the AHV/IV pension (scale 44 - gaps)", () => {
  const full = calculateAhvIv(baseInput).annual
  const withGaps = calculateAhvIv({ ...baseInput, contributionGaps: 11 }).annual
  assert.ok(withGaps < full)
})

test("estimateBvg returns zero coordinated wage below the BVG entry threshold", () => {
  assert.equal(estimateBvg({ ...baseInput, salary: 20_000 }).coordinated, 0)
  assert.ok(estimateBvg({ ...baseInput, salary: 80_000 }).coordinated > 0)
})

test("computeGap: full coverage yields zero gap, cover is clamped to 999", () => {
  const values: ValuesByRisk = {
    iv: {},
    death: {},
    retirement: { ahv: 40_000, bvg: 30_000, third: 20_000, other: 0 }, // sum = 90_000 = target
  }
  const full = computeGap({ ...baseInput, risk: "retirement" }, values)
  assert.equal(full.target, 90_000)
  assert.equal(full.total, 90_000)
  assert.equal(full.gap, 0)
  assert.equal(Math.round(full.cover), 100)

  const over: ValuesByRisk = { iv: {}, death: {}, retirement: { ahv: 100_000_000 } }
  assert.equal(computeGap({ ...baseInput, risk: "retirement" }, over).cover, 999)
})

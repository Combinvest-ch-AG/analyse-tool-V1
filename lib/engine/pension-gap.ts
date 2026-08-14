// Vorsorgelücken-Engine (Deckungsanalyse Invalidität / Pensionierung / Todesfall)
// 1:1-Port der Inline-Logik aus vorsorgerechner.html — Mathematik unverändert.
// AHV/IV-Skala 44 (Werte 2025/2026), BVG-Gutschriftssätze, Koordination/Überentschädigung.

import { ahvScale44 } from "./ahv-retirement.ts"
export { ahvScale44 } from "./ahv-retirement.ts"

export type Risk = "iv" | "retirement" | "death"
export type ValueKey = "ahv" | "ahvChild" | "bvg" | "bvgChild" | "uvg" | "third" | "other"
export type Cause = "illness" | "accident"

export type RiskValues = Partial<Record<ValueKey, number>>
export type ValuesByRisk = Record<Risk, RiskValues>

export const RISK_LABELS: Record<Risk, string> = {
  iv: "Invalidität",
  retirement: "Pensionierung",
  death: "Todesfall",
}

export const RISK_HEADINGS: Record<Risk, string> = {
  iv: "Invaliditätsleistungen",
  retirement: "Pensionierungsleistungen",
  death: "Todesfallleistungen",
}

export const COLORS: Record<ValueKey, string> = {
  ahv: "#24a66f",
  ahvChild: "#55bd8d",
  bvg: "#3978f6",
  bvgChild: "#6b9af8",
  uvg: "#8a62d3",
  third: "#ed9f2c",
  other: "#8492a8",
}

export const CONFIGS: Record<Risk, [ValueKey, string][]> = {
  iv: [
    ["ahv", "AHV/IV-Rente"],
    ["ahvChild", "IV-Kinderrenten total (automatisch 40 % je Kind)"],
    ["bvg", "BVG-Invalidenrente (koordiniert)"],
    ["bvgChild", "BVG-Invalidenkinderrenten total"],
    ["uvg", "UVG-Komplementärrente"],
    ["third", "Säule 3a / private IV-Rente"],
    ["other", "Weitere Leistungen"],
  ],
  retirement: [
    ["ahv", "AHV-Altersrente inkl. 13. Rente"],
    ["bvg", "BVG-Altersrente"],
    ["third", "3a-Entnahme als Jahresbetrag"],
    ["other", "Weitere Renten / Einkommen"],
  ],
  death: [
    ["ahv", "AHV Partner-Hinterlassenenrente"],
    ["ahvChild", "AHV Waisenrenten total"],
    ["bvg", "BVG Partnerrente"],
    ["bvgChild", "BVG Waisenrenten total"],
    ["third", "3a / Todesfallleistung als Jahresbedarf"],
    ["other", "Weitere Leistungen"],
  ],
}

export function bvgCreditRate(a: number): number {
  return a < 35 ? 0.07 : a < 45 ? 0.1 : a < 55 ? 0.15 : 0.18
}

export function bvgIvShare(d: number): number {
  return d < 40 ? 0 : d < 50 ? 0.25 + (d - 40) * 0.025 : d < 70 ? d / 100 : 1
}

export interface GapInputs {
  risk: Risk
  salary: number
  targetPct: number
  cause: Cause
  degree: number
  averageIncome: number
  contributionGaps: number
  children: number
  age: number
  startAge: number
}

export interface AhvCalc {
  annual: number
  usedIncome: number
  fullMonthly: number
  scale: number
  share: number
  income: number
  incomeIsFallback: boolean
  possible: boolean
}

// AHV/IV-Rente (automatisch nach Skala 44) — nur für Risiko "iv" relevant.
export function calculateAhvIv(inp: GapInputs): AhvCalc {
  const entered = Math.max(0, inp.averageIncome || 0)
  const fallback = Math.max(0, inp.salary || 0)
  const income = entered || fallback
  const gaps = Math.max(0, Math.min(43, inp.contributionGaps || 0))
  const scale = 44 - gaps
  const share = bvgIvShare(inp.degree || 0)
  if (!income) {
    return { annual: 0, usedIncome: 0, fullMonthly: 0, scale, share, income: 0, incomeIsFallback: !entered, possible: false }
  }
  const base = ahvScale44(income)
  const partialMonthly = Math.round((base.monthly * scale) / 44)
  const annual = Math.round(partialMonthly * 12 * share)
  return {
    annual,
    usedIncome: base.usedIncome,
    fullMonthly: base.monthly,
    scale,
    share,
    income,
    incomeIsFallback: !entered,
    possible: true,
  }
}

// AHV-Altersrente nach Skala 44. Seit Dezember 2026 wird die Altersrente
// dreizehnmal pro Jahr ausgerichtet; für die Jahresdeckung werden deshalb
// 13 Monatsrenten berücksichtigt.
export function calculateAhvRetirementGap(inp: GapInputs): AhvCalc {
  const entered = Math.max(0, inp.averageIncome || 0)
  const fallback = Math.max(0, inp.salary || 0)
  const income = entered || fallback
  const gaps = Math.max(0, Math.min(43, inp.contributionGaps || 0))
  const scale = 44 - gaps
  if (!income) {
    return { annual: 0, usedIncome: 0, fullMonthly: 0, scale, share: 1, income: 0, incomeIsFallback: !entered, possible: false }
  }
  const base = ahvScale44(income)
  const partialMonthly = Math.round((base.monthly * scale) / 44)
  return {
    annual: Math.round(partialMonthly * 13),
    usedIncome: base.usedIncome,
    fullMonthly: base.monthly,
    scale,
    share: 1,
    income,
    incomeIsFallback: !entered,
    possible: true,
  }
}

// IV-Kinderrenten (40 % der IV-Rente je Kind, plafoniert auf 90 %-Grenze).
export function syncIvChildPensions(inp: GapInputs, ivAhv: number): { value: number; capped: boolean } {
  const kids = Math.max(0, inp.children || 0)
  const raw = ivAhv * 0.4 * kids
  const entered = Math.max(0, inp.averageIncome || 0)
  const income = entered || Math.max(0, inp.salary || 0)
  const share = bvgIvShare(inp.degree || 0)
  const incomeLimit = Math.max(0, income * 0.9 * share - ivAhv)
  const value = Math.round(Math.min(raw, incomeLimit))
  return { value, capped: value + 1 < raw }
}

export interface BvgEstimate {
  coordinated: number
  capital: number
  iv: number
  ivChild: number
  retirement: number
  death: number
  deathChild: number
}

export function estimateBvg(inp: GapInputs): BvgEstimate {
  const wage = Math.max(0, inp.salary || 0)
  const a = Math.max(18, Math.min(65, inp.age || 40))
  const start = Math.max(25, Math.min(a, inp.startAge || 25))
  const coordinated = wage < 22680 ? 0 : Math.max(3780, Math.min(90720, wage) - 26460)
  let capital = 0
  for (let y = start; y < a; y++) capital = (capital + coordinated * bvgCreditRate(y)) * 1.0125
  for (let f = Math.max(25, a); f < 65; f++) capital += coordinated * bvgCreditRate(f)
  const full = capital * 0.068
  const iv = full * bvgIvShare(inp.degree || 0)
  const kids = Math.max(0, inp.children || 0)
  return {
    coordinated,
    capital,
    iv,
    ivChild: iv * 0.2 * kids,
    retirement: full,
    death: full * 0.6,
    deathChild: full * 0.2 * kids,
  }
}

export interface ResolveResult {
  /** Effective values used for the gap: manual override where set, otherwise the auto value. */
  values: ValuesByRisk
  /** Deterministic engine values (from average income / scale). */
  auto: ValuesByRisk
  /** Which keys the engine derives automatically (per risk) — these show an "Auto" badge and reset. */
  autoKeys: Record<Risk, Partial<Record<ValueKey, boolean>>>
  ahvCalc: AhvCalc | null
  childCapped: boolean
  bvgEstimate: BvgEstimate | null
}

const ALL_RISKS: Risk[] = ["iv", "retirement", "death"]

/**
 * Resolves the effective value map. The deterministic engine (AHV/IV & AHV
 * retirement from average income, IV child pensions, BVG minimum) is ALWAYS
 * computed as the auto baseline. Manual inputs override it per key
 * (`manual ?? auto`) — auto and override are no longer mutually exclusive, so
 * every field stays editable while defaulting to the income-derived value.
 * Survivor AHV cannot be inferred from salary and therefore has no auto value.
 */
export function resolveValues(inp: GapInputs, manual: ValuesByRisk): ResolveResult {
  const auto: ValuesByRisk = { iv: {}, retirement: {}, death: {} }
  const autoKeys: Record<Risk, Partial<Record<ValueKey, boolean>>> = { iv: {}, retirement: {}, death: {} }

  // AHV/IV and AHV retirement — always deterministic from average income + scale.
  const ivCalc = calculateAhvIv(inp)
  const retirementCalc = calculateAhvRetirementGap(inp)
  auto.iv.ahv = ivCalc.annual
  auto.retirement.ahv = retirementCalc.annual
  autoKeys.iv.ahv = true
  autoKeys.retirement.ahv = true
  const ahvCalc = inp.risk === "retirement" ? retirementCalc : inp.risk === "iv" ? ivCalc : null

  // IV child pensions derive from the EFFECTIVE iv.ahv (manual override wins).
  const effIvAhv = manual.iv.ahv ?? auto.iv.ahv ?? 0
  const child = syncIvChildPensions(inp, effIvAhv)
  auto.iv.ahvChild = child.value
  autoKeys.iv.ahvChild = true
  const childCapped = child.capped

  // BVG minimum — always estimated as the auto baseline.
  const m = estimateBvg(inp)
  const effIvAhvChild = manual.iv.ahvChild ?? auto.iv.ahvChild ?? 0
  if (inp.cause !== "accident") {
    let room = Math.max(0, (inp.salary || 0) * 0.9 - effIvAhv - effIvAhvChild)
    m.iv = Math.min(m.iv, room)
    room = Math.max(0, room - m.iv)
    m.ivChild = Math.min(m.ivChild, room)
  }
  auto.iv.bvg = inp.cause === "accident" ? 0 : Math.round(m.iv)
  auto.iv.bvgChild = inp.cause === "accident" ? 0 : Math.round(m.ivChild)
  auto.retirement.bvg = Math.round(m.retirement)
  auto.death.bvg = Math.round(m.death)
  auto.death.bvgChild = Math.round(m.deathChild)
  autoKeys.iv.bvg = true
  autoKeys.iv.bvgChild = true
  autoKeys.retirement.bvg = true
  autoKeys.death.bvg = true
  autoKeys.death.bvgChild = true
  const bvgEstimate = m

  // Effective values: manual override wins, otherwise the auto value.
  const values: ValuesByRisk = { iv: {}, retirement: {}, death: {} }
  for (const r of ALL_RISKS) {
    const keys = new Set<ValueKey>([
      ...(Object.keys(auto[r]) as ValueKey[]),
      ...(Object.keys(manual[r]) as ValueKey[]),
    ])
    for (const k of keys) {
      const mv = manual[r][k]
      values[r][k] = mv !== undefined ? mv : auto[r][k] ?? 0
    }
  }

  return { values, auto, autoKeys, ahvCalc, childCapped, bvgEstimate }
}

export interface GapItem {
  key: ValueKey
  name: string
  value: number
}

export interface GapResult {
  items: GapItem[]
  target: number
  total: number
  gap: number
  cover: number
}

export function computeGap(inp: GapInputs, values: ValuesByRisk): GapResult {
  const salary = Math.max(0, inp.salary || 0)
  const target = salary * (inp.targetPct / 100)
  let items: GapItem[] = CONFIGS[inp.risk].map(([key, name]) => ({ key, name, value: values[inp.risk][key] || 0 }))
  if (inp.risk === "iv" && inp.cause !== "accident") items = items.filter((x) => x.key !== "uvg")
  const total = items.reduce((s, x) => s + x.value, 0)
  const gap = Math.max(0, target - total)
  const cover = target ? Math.min(999, (total / target) * 100) : 0
  return { items, target, total, gap, cover }
}

// Zwei-Phasen-Vorsorge-Engine (deterministisch, reine Funktionen)
// 1:1-Port aus engine/pension-engine.mjs — Mathematik unverändert.
// Die originale .mjs + .test.mjs bleiben als Regressionsnetz erhalten.

export type Freq = "m" | "q" | "y"

export interface SeriesPoint {
  t: number
  cap: number
}

export const monthlyRate = (annualPct: number): number => Math.pow(1 + annualPct / 100, 1 / 12) - 1

// Sparphase: monatliche Aufzinsung, unterjährige Beiträge, jährliche Dynamik auf die Sparrate
export function accumulate({
  start,
  monthly,
  annualRatePct,
  dynamikPct,
  years,
  freq = "m",
}: {
  start: number
  monthly: number
  annualRatePct: number
  dynamikPct: number
  years: number
  freq?: Freq
}): { endCapital: number; series: SeriesPoint[] } {
  const rm = monthlyRate(annualRatePct)
  const months = Math.round(years * 12)
  const step = freq === "y" ? 12 : freq === "q" ? 3 : 1
  let cap = start
  let rate = monthly
  const series: SeriesPoint[] = [{ t: 0, cap }]
  for (let m = 1; m <= months; m++) {
    cap *= 1 + rm
    if (m % step === 0) cap += rate * step
    if (m % 12 === 0 && m < months) rate *= 1 + dynamikPct / 100
    if (m % 12 === 0 || m === months) series.push({ t: m / 12, cap })
  }
  return { endCapital: cap, series }
}

// Benötigtes Kapital bei Rentenbeginn (Barwert nachschüssige Rente)
export function requiredCapital({
  withdrawalMonth,
  annualRatePct,
  years,
}: {
  withdrawalMonth: number
  annualRatePct: number
  years: number
}): number {
  const i = monthlyRate(annualRatePct)
  const n = Math.round(years * 12)
  if (i === 0) return withdrawalMonth * n
  return (withdrawalMonth * (1 - Math.pow(1 + i, -n))) / i
}

// Entnahmephase: Kapitalabbau (für die Kurve)
export function decumulate({
  start,
  withdrawalMonth,
  annualRatePct,
  years,
  tOffset = 0,
}: {
  start: number
  withdrawalMonth: number
  annualRatePct: number
  years: number
  tOffset?: number
}): { series: SeriesPoint[]; endCapital: number } {
  const rm = monthlyRate(annualRatePct)
  const months = Math.round(years * 12)
  let cap = start
  const series: SeriesPoint[] = [{ t: tOffset, cap }]
  for (let m = 1; m <= months; m++) {
    cap = cap * (1 + rm) - withdrawalMonth
    if (m % 12 === 0 || m === months) series.push({ t: tOffset + m / 12, cap: Math.max(0, cap) })
  }
  return { series, endCapital: cap }
}

// Löse benötigte Sparrate/Monat, damit Endkapital = Zielkapital (Binärsuche)
export function solveSavingsRate({
  start,
  target,
  annualRatePct,
  dynamikPct,
  years,
  freq = "m",
}: {
  start: number
  target: number
  annualRatePct: number
  dynamikPct: number
  years: number
  freq?: Freq
}): number {
  if (accumulate({ start, monthly: 0, annualRatePct, dynamikPct, years, freq }).endCapital >= target) return 0
  let lo = 0
  let hi = 100
  while (accumulate({ start, monthly: hi, annualRatePct, dynamikPct, years, freq }).endCapital < target) hi *= 2
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2
    if (accumulate({ start, monthly: mid, annualRatePct, dynamikPct, years, freq }).endCapital < target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export interface RetirementInput {
  start: number
  withdrawalMonth: number
  accRatePct: number
  decRatePct: number
  dynamikPct: number
  accYears: number
  decYears: number
  freq?: Freq
}

export interface RetirementPlan {
  requiredSavings: number
  targetCapital: number
  peakYear: number
  series: SeriesPoint[]
}

export function planRetirement(inp: RetirementInput): RetirementPlan {
  const target = requiredCapital({
    withdrawalMonth: inp.withdrawalMonth,
    annualRatePct: inp.decRatePct,
    years: inp.decYears,
  })
  const savings = solveSavingsRate({
    start: inp.start,
    target,
    annualRatePct: inp.accRatePct,
    dynamikPct: inp.dynamikPct,
    years: inp.accYears,
    freq: inp.freq,
  })
  const acc = accumulate({
    start: inp.start,
    monthly: savings,
    annualRatePct: inp.accRatePct,
    dynamikPct: inp.dynamikPct,
    years: inp.accYears,
    freq: inp.freq,
  })
  const dec = decumulate({
    start: acc.endCapital,
    withdrawalMonth: inp.withdrawalMonth,
    annualRatePct: inp.decRatePct,
    years: inp.decYears,
    tOffset: inp.accYears,
  })
  return {
    requiredSavings: savings,
    targetCapital: acc.endCapital,
    peakYear: inp.accYears,
    series: acc.series.concat(dec.series.slice(1)),
  }
}

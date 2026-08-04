// Deterministische Vermögensmathematik.
// Renditen werden als effektive Jahresrenditen verstanden; Sparbeiträge
// fliessen jeweils am Monatsende (nachschüssig).

export function annualToMonthlyRate(annualPct: number): number {
  const annual = Math.max(-99.99, Number(annualPct) || 0) / 100
  return Math.pow(1 + annual, 1 / 12) - 1
}

export function futureValue({
  capital,
  monthly,
  years,
  annualRatePct,
}: {
  capital: number
  monthly: number
  years: number
  annualRatePct: number
}): number {
  const cap = Math.max(0, Number(capital) || 0)
  const contribution = Math.max(0, Number(monthly) || 0)
  const months = Math.max(0, Math.round((Number(years) || 0) * 12))
  const rate = annualToMonthlyRate(annualRatePct)
  if (!months) return cap
  if (Math.abs(rate) < 1e-12) return cap + contribution * months
  return cap * Math.pow(1 + rate, months) + contribution * ((Math.pow(1 + rate, months) - 1) / rate)
}

export function requiredMonthlySavings({
  capital,
  target,
  years,
  annualRatePct,
}: {
  capital: number
  target: number
  years: number
  annualRatePct: number
}): number {
  const cap = Math.max(0, Number(capital) || 0)
  const goal = Math.max(0, Number(target) || 0)
  const months = Math.max(0, Math.round((Number(years) || 0) * 12))
  if (!months) return goal > cap ? Number.POSITIVE_INFINITY : 0
  const rate = annualToMonthlyRate(annualRatePct)
  const grownCapital = cap * Math.pow(1 + rate, months)
  if (grownCapital >= goal) return 0
  if (Math.abs(rate) < 1e-12) return (goal - cap) / months
  return ((goal - grownCapital) * rate) / (Math.pow(1 + rate, months) - 1)
}

export function monthsToTarget({
  capital,
  monthly,
  target,
  annualRatePct,
  maxYears = 120,
}: {
  capital: number
  monthly: number
  target: number
  annualRatePct: number
  maxYears?: number
}): number {
  const cap = Math.max(0, Number(capital) || 0)
  const contribution = Math.max(0, Number(monthly) || 0)
  const goal = Math.max(0, Number(target) || 0)
  const maxMonths = Math.max(1, Math.round(Math.max(1, maxYears) * 12))

  if (cap >= goal) return 0
  if (!cap && !contribution) return Number.POSITIVE_INFINITY

  // Iterate monthly so the result uses the exact same convention as
  // futureValue: effective annual return and contributions at month-end.
  const rate = annualToMonthlyRate(annualRatePct)
  let balance = cap
  for (let month = 1; month <= maxMonths; month += 1) {
    balance = balance * (1 + rate) + contribution
    if (balance >= goal) return month
  }

  return Number.POSITIVE_INFINITY
}

export function purchasingPower(amount: number, years: number, inflationPct: number): number {
  const value = Math.max(0, Number(amount) || 0)
  const duration = Math.max(0, Number(years) || 0)
  const inflation = Math.max(-99.99, Number(inflationPct) || 0) / 100
  return value / Math.pow(1 + inflation, duration)
}

export function netReturnAfterCosts(grossReturnPct: number, annualCostPct: number): number {
  const gross = Math.max(-99.99, Number(grossReturnPct) || 0) / 100
  const costs = Math.max(0, Number(annualCostPct) || 0) / 100
  return ((1 + gross) / (1 + costs) - 1) * 100
}

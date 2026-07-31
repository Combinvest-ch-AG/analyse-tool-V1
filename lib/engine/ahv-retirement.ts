export function ahvScale44(income: number): { usedIncome: number; monthly: number } {
  if (!(Number(income) > 0)) return { usedIncome: 0, monthly: 0 }
  const minimum = 1260
  const step = 1512
  const used = Math.min(90720, Math.max(15120, Math.ceil(Math.max(0, income) / step) * step))
  const monthly = used <= 45360 ? 0.74 * minimum + (13 / 600) * used : 1.04 * minimum + (8 / 600) * used
  return { usedIncome: used, monthly: Math.round(Math.max(minimum, Math.min(2520, monthly))) }
}

export function calculateAhvRetirement({
  averageIncome,
  contributionYears,
  desiredMonthlyIncome,
}: {
  averageIncome: number
  contributionYears: number
  desiredMonthlyIncome: number
}) {
  const base = ahvScale44(averageIncome)
  const years = Math.max(1, Math.min(44, Math.round(contributionYears || 44)))
  const ordinaryMonthly = Math.round((base.monthly * years) / 44)
  // Seit 2026 wird eine zusätzliche Altersrente im Dezember ausgerichtet.
  // Für die Jahresplanung entspricht das bei ganzjährigem Bezug 13 Monatsrenten.
  const annualIncluding13th = ordinaryMonthly * 13
  const monthlyEquivalent = annualIncluding13th / 12
  const desired = Math.max(0, Number(desiredMonthlyIncome) || 0)
  const gapMonthly = Math.max(0, desired - monthlyEquivalent)
  const cover = desired > 0 ? Math.min(100, (monthlyEquivalent / desired) * 100) : 0

  return {
    usedIncome: base.usedIncome,
    scale: years,
    ordinaryMonthly,
    annualIncluding13th,
    monthlyEquivalent,
    gapMonthly,
    cover,
  }
}

export const ADULT_FRANCHISES = Object.freeze([300, 500, 1000, 1500, 2000, 2500]);
export const CHILD_FRANCHISES = Object.freeze([0, 100, 200, 300, 400, 500, 600]);

export function costSharing(healthCosts, franchise, ageGroup = "ERW") {
  const costs = Math.max(0, Number(healthCosts) || 0);
  const deductible = Math.max(0, Number(franchise) || 0);
  const retentionCap = ageGroup === "KIN" ? 350 : 700;
  const paidDeductible = Math.min(costs, deductible);
  const retention = Math.min(Math.max(0, costs - deductible) * 0.1, retentionCap);
  return {
    deductible: paidDeductible,
    retention,
    total: paidDeductible + retention,
    maximum: deductible + retentionCap,
  };
}

export function compareFranchises(premiums, healthCosts, ageGroup = "ERW") {
  return premiums
    .map(([franchise, monthlyPremium]) => {
      const annualPremium = Number(monthlyPremium) * 12;
      const sharing = costSharing(healthCosts, franchise, ageGroup);
      return {
        franchise: Number(franchise),
        monthlyPremium: Number(monthlyPremium),
        annualPremium,
        deductible: sharing.deductible,
        retention: sharing.retention,
        costSharing: sharing.total,
        maximumCostSharing: sharing.maximum,
        annualTotal: annualPremium + sharing.total,
      };
    })
    .sort((a, b) => a.annualTotal - b.annualTotal || a.franchise - b.franchise)
    .map((row, index, rows) => ({
      ...row,
      rank: index + 1,
      difference: row.annualTotal - rows[0].annualTotal,
    }));
}

export function ageGroupFromBirthYear(birthYear, referenceYear = 2026) {
  const year = Number(birthYear);
  if (!Number.isInteger(year) || year < 1900 || year > referenceYear) return null;
  const age = referenceYear - year;
  if (age <= 18) return "KIN";
  if (age <= 25) return "JUG";
  return "ERW";
}

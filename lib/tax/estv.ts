const ESTV_BASE =
  "https://swisstaxcalculator.estv.admin.ch/delegate/ost-integration/v1/lg-proxy/operation/c3b67379_ESTV"

export const TAX_DATA_YEAR = 2026
export const MAX_3A_WITH_PENSION_FUND = 7_258
export const MAX_3A_WITHOUT_PENSION_FUND = 36_288

export type TaxLocation = {
  TaxLocationID: number
  ZipCode: string
  BfsID: number
  CantonID: number
  BfsName: string
  City: string
  Canton: string
}

export type TaxProfile = {
  taxYear: number
  taxLocationId: number
  relationship: 1 | 2 | 3 | 4
  confession1: 1 | 2 | 3 | 4 | 5
  confession2?: 0 | 1 | 2 | 3 | 4 | 5
  children: number[]
  age1: number
  age2?: number
  revenueType1: 1 | 2 | 3 | 4
  revenueType2?: 0 | 1 | 2 | 3 | 4
  grossIncome1: number
  grossIncome2?: number
  fortune: number
}

type EstvEnvelope<T> = { response: T }

export type EstvDeductionLine = {
  label: string
  canton: number
  federal: number
}

export type IncomeTaxResult = {
  source: "ESTV"
  taxYear: number
  location: TaxLocation
  totalTax: number
  federalTax: number
  cantonalTax: number
  municipalTax: number
  churchTax: number
  personalTax: number
  effectiveRate: number
  marginalRate: number
  taxableIncomeCanton: number
  taxableIncomeFederal: number
  taxableFortuneCanton: number
  grossIncome: number
  netIncomeBeforeTax: number
  netIncomeAfterTax: number
  monthlyTax: number
  deductions: EstvDeductionLine[]
}

export type Pillar3aTaxResult = IncomeTaxResult & {
  contribution: number
  maximumContribution: number
  taxAfterContribution: number
  annualSaving: number
  monthlySaving: number
  marginalSavingRate: number
}

export type CapitalTaxResult = {
  source: "ESTV"
  taxYear: number
  location: TaxLocation
  capital: number
  totalTax: number
  federalTax: number
  cantonalTax: number
  municipalTax: number
  churchTax: number
  netCapital: number
  effectiveRate: number
}

type DetailedEstvResult = {
  TotalTax: number
  TotalNetTax: number
  IncomeTaxFed: number
  IncomeTaxCanton: number
  IncomeTaxCity: number
  IncomeTaxChurch: number
  PersonalTax: number
  MarginalTaxRate: number
  TaxableIncomeCanton: number
  TaxableIncomeFed: number
  TaxableFortuneCanton: number
  AssertiveIncomeCanton: number
  AssertiveIncomeFed: number
  Location: TaxLocation
  IncomeP1?: { GrossIncome: number; NetIncome: number }
  IncomeP2?: { GrossIncome: number; NetIncome: number }
  InfoBoth?: Array<{
    Group?: { DE?: string }
    Entry?: { DE?: string }
    Canton?: number
    Fed?: number
    Main?: number
  }>
}

type SimpleEstvResult = {
  TotalTax: number
  TotalNetTax: number
  IncomeTaxFed: number
  IncomeTaxCanton: number
  IncomeTaxCity: number
  IncomeTaxChurch: number
  PersonalTax: number
  Location: TaxLocation
}

async function estvPost<T>(operation: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${ESTV_BASE}/${operation}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  })

  if (!response.ok) {
    throw new Error(`ESTV_${operation}_${response.status}`)
  }

  const data = (await response.json()) as EstvEnvelope<T>
  if (data?.response == null) throw new Error(`ESTV_${operation}_EMPTY`)
  return data.response
}

function partnerFields(profile: TaxProfile) {
  const hasPartner = profile.relationship === 2 || profile.relationship === 4
  return {
    Confession2: hasPartner ? profile.confession2 || 4 : 0,
    Age2: hasPartner ? profile.age2 || profile.age1 : 0,
    RevenueType2: hasPartner ? profile.revenueType2 || 1 : 0,
    Revenue2: hasPartner ? profile.grossIncome2 || 0 : 0,
  }
}

function commonFields(profile: TaxProfile) {
  return {
    SimKey: null,
    TaxYear: profile.taxYear,
    TaxLocationID: profile.taxLocationId,
    Relationship: profile.relationship,
    Confession1: profile.confession1,
    Children: profile.children.map((age) => ({ Age: age })),
    ...partnerFields(profile),
  }
}

function detailedRequest(profile: TaxProfile) {
  return {
    ...commonFields(profile),
    Age1: profile.age1,
    RevenueType1: profile.revenueType1,
    Revenue1: profile.grossIncome1,
    Fortune: profile.fortune,
    Budget: [],
  }
}

function simpleRequest(
  profile: TaxProfile,
  taxableIncomeCanton: number,
  taxableIncomeFederal: number,
  taxableFortuneCanton: number,
) {
  return {
    ...commonFields(profile),
    TaxableIncomeCanton: Math.max(0, Math.round(taxableIncomeCanton)),
    TaxableIncomeFed: Math.max(0, Math.round(taxableIncomeFederal)),
    TaxableFortune: Math.max(0, Math.round(taxableFortuneCanton)),
  }
}

function normalizeDeductions(result: DetailedEstvResult): EstvDeductionLine[] {
  return (result.InfoBoth ?? [])
    .filter((line) => line.Main === 1 && ((line.Canton ?? 0) < 0 || (line.Fed ?? 0) < 0))
    .map((line) => ({
      label: line.Entry?.DE || line.Group?.DE || "Abzug",
      canton: Math.abs(line.Canton ?? 0),
      federal: Math.abs(line.Fed ?? 0),
    }))
}

function mapIncome(profile: TaxProfile, result: DetailedEstvResult): IncomeTaxResult {
  const grossIncome = (result.IncomeP1?.GrossIncome ?? profile.grossIncome1) +
    (result.IncomeP2?.GrossIncome ?? profile.grossIncome2 ?? 0)
  const netIncomeBeforeTax = (result.IncomeP1?.NetIncome ?? profile.grossIncome1) +
    (result.IncomeP2?.NetIncome ?? profile.grossIncome2 ?? 0)
  const totalTax = Math.max(0, result.TotalNetTax ?? result.TotalTax ?? 0)

  return {
    source: "ESTV",
    taxYear: profile.taxYear,
    location: result.Location,
    totalTax,
    federalTax: Math.max(0, result.IncomeTaxFed ?? 0),
    cantonalTax: Math.max(0, result.IncomeTaxCanton ?? 0),
    municipalTax: Math.max(0, result.IncomeTaxCity ?? 0),
    churchTax: Math.max(0, result.IncomeTaxChurch ?? 0),
    personalTax: Math.max(0, result.PersonalTax ?? 0),
    effectiveRate: grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0,
    marginalRate: Math.max(0, result.MarginalTaxRate ?? 0),
    taxableIncomeCanton: Math.max(0, result.TaxableIncomeCanton ?? result.AssertiveIncomeCanton ?? 0),
    taxableIncomeFederal: Math.max(0, result.TaxableIncomeFed ?? result.AssertiveIncomeFed ?? 0),
    taxableFortuneCanton: Math.max(0, result.TaxableFortuneCanton ?? 0),
    grossIncome,
    netIncomeBeforeTax,
    netIncomeAfterTax: Math.max(0, netIncomeBeforeTax - totalTax),
    monthlyTax: totalTax / 12,
    deductions: normalizeDeductions(result),
  }
}

export async function searchTaxLocations(query: string, taxYear = TAX_DATA_YEAR) {
  return estvPost<TaxLocation[]>("API_searchLocation", {
    Search: query.trim(),
    Language: 1,
    TaxYear: taxYear,
  })
}

export async function calculateIncomeTax(profile: TaxProfile, additionalDeductions = 0) {
  const detailed = await estvPost<DetailedEstvResult>("API_calculateDetailedTaxes", detailedRequest(profile))
  const base = mapIncome(profile, detailed)
  if (additionalDeductions <= 0) return base

  const adjusted = await estvPost<SimpleEstvResult>(
    "API_calculateSimpleTaxes",
    simpleRequest(
      profile,
      base.taxableIncomeCanton - additionalDeductions,
      base.taxableIncomeFederal - additionalDeductions,
      base.taxableFortuneCanton,
    ),
  )
  const totalTax = Math.max(0, adjusted.TotalNetTax ?? adjusted.TotalTax ?? 0)
  return {
    ...base,
    totalTax,
    federalTax: Math.max(0, adjusted.IncomeTaxFed ?? 0),
    cantonalTax: Math.max(0, adjusted.IncomeTaxCanton ?? 0),
    municipalTax: Math.max(0, adjusted.IncomeTaxCity ?? 0),
    churchTax: Math.max(0, adjusted.IncomeTaxChurch ?? 0),
    personalTax: Math.max(0, adjusted.PersonalTax ?? 0),
    taxableIncomeCanton: Math.max(0, base.taxableIncomeCanton - additionalDeductions),
    taxableIncomeFederal: Math.max(0, base.taxableIncomeFederal - additionalDeductions),
    effectiveRate: base.grossIncome > 0 ? (totalTax / base.grossIncome) * 100 : 0,
    netIncomeAfterTax: Math.max(0, base.netIncomeBeforeTax - totalTax),
    monthlyTax: totalTax / 12,
  }
}

export async function calculatePillar3aTax(
  profile: TaxProfile,
  requestedContribution: number,
  hasPensionFund: boolean,
): Promise<Pillar3aTaxResult> {
  const base = await calculateIncomeTax(profile)
  const maximumContribution = hasPensionFund
    ? MAX_3A_WITH_PENSION_FUND
    : Math.min(MAX_3A_WITHOUT_PENSION_FUND, profile.grossIncome1 * 0.2)
  const contribution = Math.max(0, Math.min(requestedContribution, maximumContribution))
  const after = await estvPost<SimpleEstvResult>(
    "API_calculateSimpleTaxes",
    simpleRequest(
      profile,
      base.taxableIncomeCanton - contribution,
      base.taxableIncomeFederal - contribution,
      base.taxableFortuneCanton,
    ),
  )
  const taxAfterContribution = Math.max(0, after.TotalNetTax ?? after.TotalTax ?? 0)
  const annualSaving = Math.max(0, base.totalTax - taxAfterContribution)

  return {
    ...base,
    contribution,
    maximumContribution,
    taxAfterContribution,
    annualSaving,
    monthlySaving: annualSaving / 12,
    marginalSavingRate: contribution > 0 ? (annualSaving / contribution) * 100 : 0,
  }
}

export async function calculateCapitalBenefitTax(
  profile: TaxProfile,
  capital: number,
  gender: 1 | 2,
  ageAtPayment: number,
): Promise<CapitalTaxResult> {
  const result = await estvPost<Array<{
    TaxFed: number
    TaxCanton: number
    TaxCity: number
    TaxChurch: number
    Location: TaxLocation
  }>>("API_calculateManyCapitalTaxes", {
    SimKey: null,
    TaxYear: profile.taxYear,
    TaxGroupID: profile.taxLocationId,
    Relationship: profile.relationship,
    Confession1: profile.confession1,
    Confession2: profile.relationship === 2 || profile.relationship === 4 ? profile.confession2 || 4 : 0,
    NumberOfChildren: profile.children.length,
    Gender: gender,
    AgeAtPayment: ageAtPayment,
    Capital: capital,
  })
  const row = result.find((item) => item.Location.TaxLocationID === profile.taxLocationId) ?? result[0]
  if (!row) throw new Error("ESTV_CAPITAL_EMPTY")
  const totalTax = Math.max(0, row.TaxFed + row.TaxCanton + row.TaxCity + row.TaxChurch)
  return {
    source: "ESTV",
    taxYear: profile.taxYear,
    location: row.Location,
    capital,
    totalTax,
    federalTax: Math.max(0, row.TaxFed),
    cantonalTax: Math.max(0, row.TaxCanton),
    municipalTax: Math.max(0, row.TaxCity),
    churchTax: Math.max(0, row.TaxChurch),
    netCapital: Math.max(0, capital - totalTax),
    effectiveRate: capital > 0 ? (totalTax / capital) * 100 : 0,
  }
}

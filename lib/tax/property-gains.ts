import type { TaxLocation } from "@/lib/tax/estv"

const ESTV_DOSSIER_URL = "https://www.estv.admin.ch/dam/estv/de/dokumente/estv/steuersystem/dossier-steuerinformationen/d/d-besteuerung-grundstueckgewinne.pdf"
const SO_CALCULATOR_URL = "https://so.ch/verwaltung/finanzdepartement/steueramt/privatpersonen-und-selbstaendig-erwerbende/grundstueckgewinnsteuer/"
const ZH_TARIFF_URL = "https://www.zh.ch/content/dam/zhweb/bilder-dokumente/themen/steuern-finanzen/steuern/vertreter/steuerbuch/zstb-nr-225-1.pdf"

export type PropertyGainInput = {
  taxYear: number
  location: TaxLocation
  confession: 1 | 2 | 3 | 4 | 5
  salePrice: number
  purchasePrice: number
  investments: number
  transactionCosts: number
  deferredPriorGain: number
  holdingYears: number
  replacementPurchase: boolean
  replacementPrice: number
}

export type PropertyGainTaxResult = {
  supported: boolean
  status: "official-live" | "official-tariff" | "authority-check"
  canton: string
  taxYear: number
  sourceLabel: string
  sourceUrl: string
  sourceAsOf: string
  salePrice: number
  investmentBasis: number
  grossGain: number
  deferredGain: number
  holdingReductionRate: number
  taxableGain: number
  totalTax: number | null
  effectiveRate: number | null
  components: Array<{ label: string; value: number }>
  message: string
}

type SoMunicipality = {
  Gemeinde: string
  Gemeindesteuerfuss: number
  Kirchsteuerfuss_REF?: number
  Kirchsteuerfuss_RK?: number
  Kirchsteuerfuss_CHR?: number
}

type SoBracket = {
  stufenGrenzen: number[]
  stufenSaetze: number[]
  schwelleDurchschnitt: number
  durchschnittssatz: number
}

type SoOfficialData = {
  brackets: Record<string, SoBracket>
  rates: Record<string, SoMunicipality[]>
}

function roundToFiveCents(value: number) {
  return Math.round(Math.max(0, value) * 20) / 20
}

function finiteMoney(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase()
}

function decodeHtml(value: string) {
  const named: Record<string, string> = {
    quot: '"', amp: "&", apos: "'", lt: "<", gt: ">", nbsp: " ",
    auml: "ä", Auml: "Ä", ouml: "ö", Ouml: "Ö", uuml: "ü", Uuml: "Ü",
    eacute: "é", Eacute: "É", agrave: "à", Agrave: "À", szlig: "ß",
  }
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, key: string) => {
    if (key[0] === "#") {
      const hexadecimal = key[1]?.toLowerCase() === "x"
      const number = Number.parseInt(key.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10)
      return Number.isFinite(number) ? String.fromCodePoint(number) : entity
    }
    return named[key] ?? entity
  })
}

function readDataAttribute(html: string, name: string) {
  const match = html.match(new RegExp(`${name}="([\\s\\S]*?)"\\s+data-`))
  if (!match?.[1]) throw new Error(`SO_${name.toUpperCase()}_MISSING`)
  return decodeHtml(match[1])
}

async function loadSoOfficialData(): Promise<SoOfficialData> {
  const response = await fetch(SO_CALCULATOR_URL, {
    headers: { accept: "text/html", "user-agent": "Combinvest-Steuerrechner/1.0" },
    next: { revalidate: 3_600 },
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) throw new Error(`SO_SOURCE_${response.status}`)
  const html = await response.text()
  return {
    brackets: JSON.parse(readDataAttribute(html, "data-tax-brackets")) as Record<string, SoBracket>,
    rates: JSON.parse(readDataAttribute(html, "data-tax-rates")) as Record<string, SoMunicipality[]>,
  }
}

export function propertyGainBasis(input: PropertyGainInput) {
  const salePrice = finiteMoney(input.salePrice)
  const investmentBasis = finiteMoney(input.purchasePrice) + finiteMoney(input.investments) + finiteMoney(input.transactionCosts)
  const adjustedBasis = Math.max(0, investmentBasis - finiteMoney(input.deferredPriorGain))
  const grossGain = Math.max(0, salePrice - adjustedBasis)
  let deferredGain = 0

  if (input.replacementPurchase && finiteMoney(input.replacementPrice) >= adjustedBasis) {
    const immediatelyTaxable = Math.max(0, salePrice - finiteMoney(input.replacementPrice))
    deferredGain = Math.max(0, grossGain - Math.min(grossGain, immediatelyTaxable))
  }

  return {
    salePrice,
    investmentBasis,
    grossGain,
    deferredGain,
    gainAfterDeferral: Math.max(0, grossGain - deferredGain),
  }
}

function progressiveTax(amount: number, brackets: Array<{ width: number; rate: number }>) {
  let remaining = Math.max(0, amount)
  let tax = 0
  for (const bracket of brackets) {
    if (remaining <= 0) break
    const portion = Math.min(remaining, bracket.width)
    tax += portion * bracket.rate
    remaining -= portion
  }
  return tax
}

function replacementMessage(deferredGain: number) {
  return deferredGain > 0
    ? `Davon werden CHF ${Math.round(deferredGain).toLocaleString("de-CH")} wegen der erfassten Ersatzbeschaffung aufgeschoben.`
    : "Es wurde kein Steueraufschub aus Ersatzbeschaffung berücksichtigt."
}

export function calculateZurichPropertyTax(input: PropertyGainInput): PropertyGainTaxResult {
  const basis = propertyGainBasis(input)
  const gain = basis.gainAfterDeferral
  const baseTax = gain < 5_000 ? 0 : progressiveTax(gain, [
    { width: 4_000, rate: 0.10 },
    { width: 6_000, rate: 0.15 },
    { width: 8_000, rate: 0.20 },
    { width: 12_000, rate: 0.25 },
    { width: 20_000, rate: 0.30 },
    { width: 50_000, rate: 0.35 },
    { width: Number.POSITIVE_INFINITY, rate: 0.40 },
  ])
  const years = Math.max(0, Math.floor(input.holdingYears))
  const modifier = years < 1 ? 1.5 : years < 2 ? 1.25 : years >= 20 ? 0.5 : years >= 5 ? 1 - (0.05 + (years - 5) * 0.03) : 1
  const reductionRate = modifier < 1 ? (1 - modifier) * 100 : modifier > 1 ? -(modifier - 1) * 100 : 0
  const totalTax = roundToFiveCents(baseTax * modifier)

  return {
    supported: true,
    status: "official-tariff",
    canton: "ZH",
    taxYear: input.taxYear,
    sourceLabel: "Kanton Zürich · ZStB 225.1/225.2",
    sourceUrl: ZH_TARIFF_URL,
    sourceAsOf: "09/2025",
    ...basis,
    holdingReductionRate: reductionRate,
    taxableGain: gain,
    totalTax,
    effectiveRate: basis.grossGain > 0 ? (totalTax / basis.grossGain) * 100 : 0,
    components: [{ label: "Grundstückgewinnsteuer", value: totalTax }],
    message: `${replacementMessage(basis.deferredGain)} Tarif und Besitzdauer wurden nach dem publizierten Zürcher Tarif berechnet.`,
  }
}

function simpleSoStateTax(gain: number, bracket: SoBracket) {
  if (gain > bracket.schwelleDurchschnitt) return gain * bracket.durchschnittssatz
  return progressiveTax(gain, bracket.stufenGrenzen.map((width, index) => ({ width, rate: bracket.stufenSaetze[index] ?? 0 })))
}

async function calculateSolothurnPropertyTax(input: PropertyGainInput): Promise<PropertyGainTaxResult> {
  const data = await loadSoOfficialData()
  const availableYears = Object.keys(data.brackets).map(Number).filter(Number.isFinite).sort((a, b) => b - a)
  const taxYear = availableYears.includes(input.taxYear) ? input.taxYear : availableYears[0]
  const bracket = data.brackets[String(taxYear)]
  const municipalities = data.rates[String(taxYear)] ?? data.rates[String(availableYears[0])]
  const expected = normalizeName(input.location.City || input.location.BfsName)
  const municipality = municipalities.find((item) => normalizeName(item.Gemeinde) === expected) ??
    municipalities.find((item) => normalizeName(item.Gemeinde).includes(expected) || expected.includes(normalizeName(item.Gemeinde)))
  if (!bracket || !municipality) throw new Error("SO_MUNICIPALITY_NOT_FOUND")

  const basis = propertyGainBasis(input)
  const years = Math.max(0, Math.floor(input.holdingYears))
  const holdingReductionRate = years <= 5 ? 0 : Math.min(50, (years - 5) * 2)
  const taxableGain = basis.gainAfterDeferral * (1 - holdingReductionRate / 100)
  const simpleStateTax = simpleSoStateTax(taxableGain, bracket)
  const stateTax = simpleStateTax * 1.04
  const municipalTax = simpleStateTax * (Number(municipality.Gemeindesteuerfuss) / 100)
  const churchRate = input.confession === 1
    ? municipality.Kirchsteuerfuss_REF
    : input.confession === 2
      ? municipality.Kirchsteuerfuss_RK
      : input.confession === 3
        ? municipality.Kirchsteuerfuss_CHR
        : 0
  const churchTax = simpleStateTax * (Number(churchRate) / 100)
  const totalTax = roundToFiveCents(stateTax + municipalTax + churchTax)

  return {
    supported: true,
    status: "official-live",
    canton: "SO",
    taxYear,
    sourceLabel: "Steueramt Kanton Solothurn · offizieller Online-Rechner",
    sourceUrl: SO_CALCULATOR_URL,
    sourceAsOf: `Live-Daten ${taxYear}`,
    ...basis,
    holdingReductionRate,
    taxableGain,
    totalTax,
    effectiveRate: basis.grossGain > 0 ? (totalTax / basis.grossGain) * 100 : 0,
    components: [
      { label: "Staatssteuer", value: roundToFiveCents(stateTax) },
      { label: `Gemeinde ${municipality.Gemeinde}`, value: roundToFiveCents(municipalTax) },
      ...(churchTax > 0 ? [{ label: "Kirchensteuer", value: roundToFiveCents(churchTax) }] : []),
    ],
    message: `${replacementMessage(basis.deferredGain)} Besitzesdauerabzug und Steuerfüsse stammen live vom offiziellen Rechner des Kantons Solothurn.`,
  }
}

export async function calculatePropertyGainTax(input: PropertyGainInput): Promise<PropertyGainTaxResult> {
  if (input.location.Canton === "SO") return calculateSolothurnPropertyTax(input)
  if (input.location.Canton === "ZH") return calculateZurichPropertyTax(input)

  const basis = propertyGainBasis(input)
  return {
    supported: false,
    status: "authority-check",
    canton: input.location.Canton,
    taxYear: input.taxYear,
    sourceLabel: "ESTV · Besteuerung der Grundstückgewinne",
    sourceUrl: ESTV_DOSSIER_URL,
    sourceAsOf: "kantonale Veranlagung erforderlich",
    ...basis,
    holdingReductionRate: 0,
    taxableGain: basis.gainAfterDeferral,
    totalTax: null,
    effectiveRate: null,
    components: [],
    message: "Der Gewinn ist vollständig ermittelt. Für diesen Kanton ist der Tarif im Combinvest-Rechner noch nicht amtlich verifiziert; deshalb wird bewusst kein ungesicherter Steuerbetrag angezeigt.",
  }
}

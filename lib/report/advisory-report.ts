import { readFile } from "node:fs/promises"
import { join } from "node:path"
import fontkit from "@pdf-lib/fontkit"
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFImage,
  type PDFPage,
  type PDFFont,
  type RGB,
} from "pdf-lib"

type Col = [number, number, number]

const BLUE: Col = [0.224, 0.471, 0.965]
const BLUE_DARK: Col = [0.09, 0.247, 0.65]
const NAVY: Col = [0.043, 0.098, 0.2]
const INK: Col = [0.067, 0.114, 0.212]
const MUTED: Col = [0.39, 0.45, 0.55]
const LINE: Col = [0.88, 0.91, 0.95]
const SOFT: Col = [0.956, 0.969, 0.988]
const PALE: Col = [0.918, 0.945, 1]
const GREEN: Col = [0.055, 0.56, 0.34]
const ORANGE: Col = [0.94, 0.45, 0.14]
const RED: Col = [0.79, 0.17, 0.17]
const WHITE: Col = [1, 1, 1]
const PAPER: Col = [0.982, 0.987, 0.997]
const SKY: Col = [0.72, 0.82, 1]
const MINT: Col = [0.16, 0.68, 0.53]

const PAGE: [number, number] = [595.28, 841.89]
const M = 44
const CONTENT = PAGE[0] - M * 2

const AREA_COPY: Record<string, string> = {
  health: "Franchise, Versicherungsmodell und gewünschte Gesundheitsleistungen abstimmen.",
  pensiongap: "Leistungen bei Invalidität, Pensionierung und Tod mit dem persönlichen Bedarf vergleichen.",
  investment: "Reserve, Anlagehorizont und Risikoprofil für den Vermögensaufbau festlegen.",
  "real-estate": "Eigenkapital, Tragbarkeit und langfristige Finanzierung prüfen.",
  "values-protection": "Bestehende Versicherungen auf Lücken und Doppelversicherungen kontrollieren.",
  children: "Versorgung und Vermögensaufbau für die Kinder absichern.",
  "property-creation": "Einkommensausfall und gewünschten Lebensstandard gegenüberstellen.",
  "tax-advantage": "Steuerpotenzial bei Vorsorge, Vermögen und Wohneigentum nutzen.",
}

const INTERVAL_LABEL: Record<string, string> = {
  monthly: "Monat",
  quarterly: "Quartal",
  semiannual: "Halbjahr",
  annual: "Jahr",
  oneoff: "einmalig",
}
const INTERVAL_FACTOR: Record<string, number> = {
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
  oneoff: 0,
}

export type ReportStatus = "open" | "progress" | "done"
export type ReportArea = { key: string; name: string; score: number; status: ReportStatus }
export type ReportAnswer = { id: string; question: string; answer: string }
export type ReportContract = {
  product?: string
  company?: string
  pol?: string
  premium?: number | null
  interval?: string
  abl?: string
  notes?: string
  start?: string
}
export type ReportCalculator = {
  results?: string[]
  inputs?: Record<string, unknown>
  calculationYear?: number
  source?: string
  savedAt?: string
  [key: string]: unknown
}

export type ReportData = {
  customerName: string
  createdAt?: string | null
  analysisId: string
  answerCount: number
  questionCount: number
  areas: ReportArea[]
  contracts: Record<string, ReportContract>
  customer?: {
    birthdate?: string | null
    email?: string | null
    phone?: string | null
    postcode?: string | null
    city?: string | null
  }
  advisor?: { display_name?: string; first_name?: string; last_name?: string; email?: string }
  answers: ReportAnswer[]
  modules?: {
    calculators?: Record<string, ReportCalculator>
    appointment?: { date?: string; time?: string; place?: string; purpose?: string }
  }
  notes?: Array<string | { text?: string; note?: string }>
}

type CalculatorMeta = {
  title: string
  eyebrow: string
  meaning: string
  source: string
}

const CALCULATOR_META: Record<string, CalculatorMeta> = {
  budget: {
    title: "Ihr Haushaltsbudget",
    eyebrow: "Budget und Sparpotenzial",
    meaning: "Die Gegenüberstellung zeigt, welcher Betrag nach den erfassten Ausgaben monatlich frei bleibt.",
    source: "Persönlich erfasste Einnahmen und Ausgaben",
  },
  "wealth-sparen": {
    title: "Ihre Vermögensentwicklung",
    eyebrow: "Spar- und Zinseszinsrechnung",
    meaning: "Die Berechnung zeigt den Unterschied zwischen Ihren Einzahlungen und dem möglichen Endvermögen.",
    source: "Zinseszinsrechnung mit monatlicher Einzahlung",
  },
  "wealth-zins": {
    title: "Vergleich zweier Renditen",
    eyebrow: "Renditevergleich",
    meaning: "Kleine Renditeunterschiede können über einen langen Zeitraum eine grosse Wirkung entfalten.",
    source: "Zwei Zinseszins-Szenarien",
  },
  "wealth-start": {
    title: "Sofort starten oder warten",
    eyebrow: "Zeitwirkung beim Sparen",
    meaning: "Die Berechnung macht sichtbar, welchen Einfluss ein späterer Sparbeginn auf das Endvermögen hat.",
    source: "Zinseszinsrechnung mit verzögertem Sparbeginn",
  },
  "wealth-inflation": {
    title: "Kaufkraft Ihres Vermögens",
    eyebrow: "Inflationsrechnung",
    meaning: "Die Kaufkraft zeigt, wie viel ein heutiger Betrag nach dem gewählten Zeitraum real noch wert ist.",
    source: "Kaufkraftberechnung mit konstanter Inflationsannahme",
  },
  "wealth-kosten": {
    title: "Vergleich der laufenden Anlagekosten",
    eyebrow: "TER-Vergleich",
    meaning: "Der Vergleich zeigt den langfristigen Vermögensunterschied zwischen zwei Anlagen mit unterschiedlicher TER.",
    source: "Zwei Vermögensentwicklungen nach laufenden Kosten",
  },
  "wealth-ziel": {
    title: "Wann Sie Ihr Zielvermögen erreichen",
    eyebrow: "Zielvermögensrechnung",
    meaning: "Startkapital, monatliche Sparrate und Rendite bestimmen den voraussichtlichen Zeitpunkt Ihres Ziels.",
    source: "Monatliche Zielwertrechnung mit Renditeannahme",
  },
  "wealth-3a": {
    title: "Säule 3a und Steuereffekt",
    eyebrow: "Gebundene Vorsorge",
    meaning: "Die Berechnung verbindet die jährliche Steuerwirkung mit dem möglichen langfristigen Vorsorgevermögen.",
    source: "Säule-3a-Szenario mit persönlichem Grenzsteuersatz",
  },
  "wealth-steuer": {
    title: "Steuerwirkung",
    eyebrow: "Einfacher Steuerabzug",
    meaning: "Die Darstellung zeigt die Wirkung des erfassten Grenzsteuersatzes auf das steuerbare Einkommen.",
    source: "Orientierungsrechnung mit persönlichem Grenzsteuersatz",
  },
  "pension-gap": {
    title: "Ihre Vorsorgelücke",
    eyebrow: "Vorsorge und Einkommensschutz",
    meaning: "Die vorhandenen Leistungen werden dem gewünschten Einkommen gegenübergestellt. Eine Lücke zeigt zusätzlichen Prüfbedarf.",
    source: "AHV-, BVG- und erfasste Zusatzleistungen",
  },
  "ahv-rente": {
    title: "Ihre voraussichtliche AHV-Rente",
    eyebrow: "Erste Säule",
    meaning: "Die Berechnung zeigt die monatliche AHV-Rente und die Differenz zum erfassten Wunschbedarf.",
    source: "AHV-Skala 44 und erfasste Beitragsjahre",
  },
  "real-estate-affordability": {
    title: "Tragbarkeit Ihres Wohneigentums",
    eyebrow: "Immobilienfinanzierung",
    meaning: "Die Tragbarkeit setzt die kalkulatorischen Wohnkosten ins Verhältnis zum Bruttoeinkommen.",
    source: "Schweizer Bankenstandard mit kalkulatorischen Kosten",
  },
  "health-franchise": {
    title: "Ihre passende Franchise",
    eyebrow: "Grundversicherung",
    meaning: "Der Vergleich kombiniert Prämie und erwartete Kostenbeteiligung für die ausgewählten Franchisevarianten.",
    source: "Priminfo/BAG-Prämien und erfasste Gesundheitskosten",
  },
  anlegerprofil: {
    title: "Ihr Anlegerprofil",
    eyebrow: "Risikofähigkeit und Anlagehorizont",
    meaning: "Das Profil fasst Risikobereitschaft, Wissen und Anlagehorizont zu einer verständlichen Orientierung zusammen.",
    source: "Antworten aus dem interaktiven Anlegerprofil",
  },
  "pk-ausweis": {
    title: "Angaben aus Ihrem PK-Ausweis",
    eyebrow: "Berufliche Vorsorge",
    meaning: "Die erfassten Leistungen bilden die Grundlage für eine genauere Vorsorge- und Leistungsanalyse.",
    source: "Persönlicher Vorsorgeausweis",
  },
  freizuegigkeit: {
    title: "Ihre Freizügigkeitslösung",
    eyebrow: "Berufliche Vorsorge",
    meaning: "Die Übersicht hält Ausgangslage, Guthaben und gewünschte Lösung für die weitere Bearbeitung fest.",
    source: "Persönlich erfasste Angaben",
  },
  supplementaryInsurance: {
    title: "Gewünschte Zusatzversicherungen",
    eyebrow: "Gesundheitsleistungen",
    meaning: "Die Übersicht zeigt bestehende und gewünschte Zusatzdeckungen als Grundlage für einen passenden Vergleich.",
    source: "Persönlich ausgewählte Leistungswünsche",
  },
  insuranceNeeds: {
    title: "Ihr Versicherungsbedarf",
    eyebrow: "Hausrat, Haftpflicht und Motorfahrzeug",
    meaning: "Bestehende und gewünschte Deckungen werden übersichtlich gegenübergestellt.",
    source: "Persönlich erfasste Versicherungsbedürfnisse",
  },
}

const INPUT_LABELS: Record<string, string> = {
  modus: "Berechnung",
  horizont: "Zeitraum",
  startkapital: "Startkapital",
  sparrate_monat: "Monatliche Sparrate",
  anlagehorizont: "Anlagehorizont",
  rendite_pa: "Rendite pro Jahr",
  rendite_2_pa: "Zweite Rendite pro Jahr",
  verzoegerung: "Späterer Start",
  inflation_pa: "Inflation pro Jahr",
  ter_pa: "Laufende Kosten pro Jahr",
  ter_2_pa: "Laufende Kosten Anlage 2 pro Jahr",
  zielvermoegen: "Zielvermögen",
  steuerbares_einkommen: "Steuerbares Einkommen",
  jahresbeitrag: "Jährliche Einzahlung",
  grenzsteuersatz: "Grenzsteuersatz",
  heutiger_betrag: "Heutiger Betrag",
  einkommen_monat: "Einkommen pro Monat",
  ausgaben_monat: "Ausgaben pro Monat",
  kaufpreis: "Kaufpreis",
  eigenkapital: "Eigenkapital",
  bruttoeinkommen: "Bruttoeinkommen pro Jahr",
  jahreseinkommen: "Durchschnittliches Jahreseinkommen",
  beitragsjahre: "Beitragsjahre",
  wunscheinkommen: "Gewünschtes Einkommen",
  ort: "Wohnort",
  geburtsjahr: "Geburtsjahr",
  unfalldeckung: "Unfalldeckung",
  versicherer: "Versicherer",
  tarif: "Modell/Tarif",
  gesundheitskosten: "Gesundheitskosten pro Jahr",
  risk: "Analysiertes Risiko",
  salary: "Jahreseinkommen",
  targetPct: "Zielabsicherung",
  age: "Alter",
  cause: "Ursache",
  degree: "IV-Grad",
  children: "Kinder",
  ahvMode: "AHV-Grundlage",
  bvgMode: "BVG-Grundlage",
  insuredSalary: "Versicherter Lohn",
  capital: "Altersguthaben",
  iv: "IV-Rente pro Jahr",
  ivChild: "IV-Kinderrente",
  partner: "Partnerrente",
  orphan: "Waisenrente",
  reason: "Grund",
  solution: "Gewünschte Lösung",
  pensionFund: "Bisherige Pensionskasse",
  amount: "Guthaben",
  exitDate: "Austrittsdatum",
  priority: "Priorität",
}

function safe(value: unknown): string {
  return String(value == null ? "" : value)
    .replace(/[–—−]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/→/g, ">")
    .replace(/✓/g, "OK")
    .replace(/•/g, "-")
    // StandardFonts.Helvetica uses WinAnsi. Remove unsupported glyphs.
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function chf(value: unknown): string {
  return "CHF " + Math.round(Number(value) || 0).toLocaleString("de-CH")
}

function fmtDate(value?: string | null): string {
  const d = value ? new Date(value) : new Date()
  return Number.isNaN(d.valueOf())
    ? safe(value)
    : d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function annualPremium(contract: ReportContract): number {
  return (Number(contract.premium) || 0) * (INTERVAL_FACTOR[contract.interval ?? "monthly"] ?? 12)
}

function statusLabel(status: ReportStatus): string {
  if (status === "done") return "Abgeschlossen"
  if (status === "progress") return "In Bearbeitung"
  return "Offen"
}

function statusColor(status: ReportStatus): Col {
  if (status === "done") return GREEN
  if (status === "progress") return ORANGE
  return MUTED
}

function answerValue(data: ReportData, id: string): string {
  return data.answers.find((answer) => answer.id === id)?.answer ?? ""
}

function meaningful(value: unknown): boolean {
  const text = safe(value)
  return Boolean(text && text !== "-" && text !== "Nicht erfasst" && text !== "0")
}

function humanValue(key: string, value: unknown): string {
  if (typeof value === "boolean") return value ? "Ja" : "Nein"
  if (typeof value === "number") {
    const moneyKey =
      /income|einkommen|ausgaben|kaufpreis|eigenkapital|salary|capital|startkapital|sparrate|betrag|beitrag|zielvermoegen|amount|guthaben|kosten|iv|partner|orphan/i.test(
        key,
      )
    if (moneyKey) return chf(value)
    if (/anlagehorizont|verzoegerung|years|delay/i.test(key)) return `${value} Jahre`
    if (/pct|degree|quote|rendite|inflation_pa|ter_pa|grenzsteuersatz|tax/i.test(key)) return `${value} %`
    return Number(value).toLocaleString("de-CH")
  }
  if (Array.isArray(value)) return value.map(safe).filter(Boolean).join(", ")
  return safe(value)
}

function calculatorFacts(key: string, calculator: ReportCalculator): Array<[string, string]> {
  const facts: Array<[string, string]> = []
  const source =
    calculator.inputs && typeof calculator.inputs === "object"
      ? calculator.inputs
      : key === "pk-ausweis" || key === "freizuegigkeit"
        ? calculator
        : {}

  Object.entries(source)
    .filter(([field, value]) => !["results", "savedAt", "calculator", "calculationYear", "source", "filledFields"].includes(field) && meaningful(value))
    .slice(0, 8)
    .forEach(([field, value]) => {
      if (typeof value === "object" && !Array.isArray(value)) return
      facts.push([INPUT_LABELS[field] || field.replace(/_/g, " "), humanValue(field, value)])
    })

  if (key === "anlegerprofil") {
    if (meaningful(calculator.profile)) facts.push(["Anlegerprofil", safe(calculator.profile)])
    if (meaningful(calculator.score)) facts.push(["Profilwert", `${safe(calculator.score)} / 100`])
    if (meaningful(calculator.equity)) facts.push(["Orientierende Aktienquote", `${safe(calculator.equity)} %`])
  }

  return facts.slice(0, 8)
}

function calculatorResults(key: string, calculator: ReportCalculator): string[] {
  if (Array.isArray(calculator.results) && calculator.results.length) return calculator.results.map(safe).filter(Boolean)

  if (key === "anlegerprofil") {
    return [
      meaningful(calculator.profile) ? `Profil: ${safe(calculator.profile)}` : "",
      meaningful(calculator.score) ? `Profilwert: ${safe(calculator.score)} / 100` : "",
      meaningful(calculator.equity) ? `Aktienquote: ${safe(calculator.equity)} %` : "",
    ].filter(Boolean)
  }

  if (key === "pk-ausweis") {
    return [
      Number(calculator.capital) > 0 ? `Altersguthaben: ${chf(calculator.capital)}` : "",
      Number(calculator.iv) > 0 ? `IV-Rente: ${chf(calculator.iv)} / Jahr` : "",
      Number(calculator.partner) > 0 ? `Partnerrente: ${chf(calculator.partner)} / Jahr` : "",
    ].filter(Boolean)
  }

  if (key === "freizuegigkeit") {
    return [
      meaningful(calculator.solution) ? `Lösung: ${safe(calculator.solution)}` : "",
      Number(calculator.amount) > 0 ? `Guthaben: ${chf(calculator.amount)}` : "",
      meaningful(calculator.priority) ? `Priorität: ${safe(calculator.priority)}` : "",
    ].filter(Boolean)
  }

  if (key === "supplementaryInsurance") return ["Gewünschte Zusatzdeckungen wurden für den Vergleich gespeichert."]
  if (key === "insuranceNeeds") return ["Hausrat, Privathaftpflicht und Motorfahrzeug wurden gemeinsam geprüft."]

  return []
}

function splitMetric(result: string): { label: string; value: string } {
  const colon = result.indexOf(":")
  if (colon > 0 && colon < 40) {
    return { label: safe(result.slice(0, colon)), value: safe(result.slice(colon + 1)) }
  }
  const match = result.match(/^(.*?)(CHF\s+.*|\d+(?:[.,]\d+)?\s*%.*)$/i)
  if (match && match[1].trim()) return { label: safe(match[1]), value: safe(match[2]) }
  return { label: "Ergebnis", value: safe(result) }
}

function numericCHF(value: string): number | null {
  if (!/CHF/i.test(value)) return null
  const match = value.match(/CHF\s*([0-9'’.,]+)/i)
  if (!match) return null
  const parsed = Number(match[1].replace(/['’]/g, "").replace(/\./g, "").replace(",", "."))
  return Number.isFinite(parsed) ? parsed : null
}

export async function buildAdvisoryReport(data: ReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  let regular: PDFFont
  let bold: PDFFont
  let heavy: PDFFont
  let brandIcon: PDFImage | null = null
  try {
    const [regularBytes, semiboldBytes, heavyBytes] = await Promise.all([
      readFile(join(process.cwd(), "public", "fonts", "Manrope-Regular.ttf")),
      readFile(join(process.cwd(), "public", "fonts", "Manrope-SemiBold.ttf")),
      readFile(join(process.cwd(), "public", "fonts", "Manrope-ExtraBold.ttf")),
    ])
    regular = await doc.embedFont(regularBytes, { subset: true })
    bold = await doc.embedFont(semiboldBytes, { subset: true })
    heavy = await doc.embedFont(heavyBytes, { subset: true })
  } catch {
    regular = await doc.embedFont(StandardFonts.Helvetica)
    bold = await doc.embedFont(StandardFonts.HelveticaBold)
    heavy = bold
  }
  try {
    brandIcon = await doc.embedPng(await readFile(join(process.cwd(), "public", "combinvest-icon.png")))
  } catch {
    brandIcon = null
  }
  doc.setTitle(`Combinvest Finanzanalyse - ${safe(data.customerName)}`)
  doc.setAuthor("Combinvest AG")
  doc.setSubject("Persönliche Zusammenfassung der Finanzberatung")
  doc.setCreator("Combinvest Beratungsplattform")
  doc.setCreationDate(new Date())

  const pages: PDFPage[] = []
  const color = (c: Col): RGB => rgb(c[0], c[1], c[2])
  let page = null as unknown as PDFPage
  let y = 0
  let section = ""

  function rect(x: number, bottom: number, width: number, height: number, fill?: Col, border?: Col, borderWidth = 0) {
    page.drawRectangle({
      x,
      y: bottom,
      width,
      height,
      color: fill ? color(fill) : undefined,
      borderColor: border ? color(border) : undefined,
      borderWidth,
    })
  }

  function roundRect(
    x: number,
    bottom: number,
    width: number,
    height: number,
    radius: number,
    fill: Col,
    border?: Col,
    borderWidth = 0,
  ) {
    const r = Math.min(radius, height / 2, width / 2)
    rect(x + r, bottom, width - r * 2, height, fill)
    rect(x, bottom + r, width, height - r * 2, fill)
    ;[
      [x + r, bottom + r],
      [x + width - r, bottom + r],
      [x + r, bottom + height - r],
      [x + width - r, bottom + height - r],
    ].forEach(([cx, cy]) => page.drawCircle({ x: cx, y: cy, size: r, color: color(fill) }))
    if (border && borderWidth > 0) {
      line(x + r, bottom, x + width - r, bottom, border, borderWidth)
      line(x + r, bottom + height, x + width - r, bottom + height, border, borderWidth)
      line(x, bottom + r, x, bottom + height - r, border, borderWidth)
      line(x + width, bottom + r, x + width, bottom + height - r, border, borderWidth)
    }
  }

  function pillBar(x: number, baseline: number, width: number, height: number, fill: Col) {
    const radius = height / 2
    if (width <= height) {
      page.drawCircle({ x: x + width / 2, y: baseline + radius, size: width / 2, color: color(fill) })
      return
    }
    rect(x + radius, baseline, width - height, height, fill)
    page.drawCircle({ x: x + radius, y: baseline + radius, size: radius, color: color(fill) })
    page.drawCircle({ x: x + width - radius, y: baseline + radius, size: radius, color: color(fill) })
  }

  function line(x1: number, y1: number, x2: number, y2: number, c: Col = LINE, width = 1) {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color: color(c), thickness: width })
  }

  function textWidth(value: string, font: PDFFont, size: number): number {
    return font.widthOfTextAtSize(safe(value), size)
  }

  function wrap(value: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const words = safe(value).split(" ")
    const lines: string[] = []
    let current = ""
    for (const word of words) {
      const next = current ? `${current} ${word}` : word
      if (!current || textWidth(next, font, size) <= maxWidth) current = next
      else {
        lines.push(current)
        current = word
      }
    }
    if (current) lines.push(current)
    return lines.length ? lines : [""]
  }

  type TextOptions = { size?: number; bold?: boolean; heavy?: boolean; color?: Col; maxWidth?: number }

  function drawText(value: string, x: number, baseline: number, options: TextOptions = {}) {
    page.drawText(safe(value), {
      x,
      y: baseline,
      size: options.size ?? 10,
      font: options.heavy ? heavy : options.bold ? bold : regular,
      color: color(options.color ?? INK),
      maxWidth: options.maxWidth,
    })
  }

  function paragraph(
    value: string,
    x: number,
    baseline: number,
    maxWidth: number,
    options: TextOptions & { leading?: number } = {},
  ): number {
    const size = options.size ?? 10
    const leading = options.leading ?? size * 1.45
    const lines = wrap(value, options.heavy ? heavy : options.bold ? bold : regular, size, maxWidth)
    lines.forEach((entry, index) => drawText(entry, x, baseline - index * leading, options))
    return baseline - lines.length * leading
  }

  function drawBrand(dark = false) {
    if (brandIcon) page.drawImage(brandIcon, { x: M, y: 793, width: 27, height: 27 })
    const wordmarkX = M + (brandIcon ? 34 : 0)
    drawText("comb", wordmarkX, 808, { size: 15, heavy: true, color: dark ? WHITE : NAVY })
    drawText("invest", wordmarkX, 794, { size: 15, heavy: true, color: dark ? SKY : BLUE })
  }

  function addPage(kicker: string, title: string, intro?: string) {
    page = doc.addPage(PAGE)
    pages.push(page)
    section = kicker
    drawBrand()
    drawText(kicker.toUpperCase(), PAGE[0] - M - 168, 802, { size: 7, bold: true, color: BLUE })
    line(M, 778, PAGE[0] - M, 778, LINE, 0.8)
    y = 739
    y = paragraph(title, M, y, CONTENT, { size: 25, heavy: true, color: NAVY, leading: 31 }) - 4
    if (intro) y = paragraph(intro, M, y, CONTENT - 12, { size: 9.5, color: MUTED, leading: 14 }) - 16
  }

  function ensure(height: number, continuation = "Fortsetzung") {
    if (y - height < 58) addPage(section, continuation)
  }

  function sectionTitle(kicker: string, title: string, description?: string) {
    ensure(74, title)
    drawText(kicker.toUpperCase(), M, y, { size: 7, bold: true, color: BLUE })
    y -= 18
    drawText(title, M, y, { size: 17, heavy: true, color: NAVY })
    y -= 20
    if (description) y = paragraph(description, M, y, CONTENT, { size: 9, color: MUTED, leading: 13 }) - 10
  }

  function metricCard(x: number, top: number, width: number, label: string, value: string, tone: Col = PALE) {
    roundRect(x, top - 74, width, 74, 10, tone)
    drawText(label.toUpperCase(), x + 12, top - 19, {
      size: 6.5,
      bold: true,
      color: tone === PALE ? MUTED : WHITE,
    })
    const valueSize = value.length > 24 ? 10.5 : value.length > 17 ? 12.5 : 16
    const valueColor = tone === PALE ? NAVY : WHITE
    const lines = wrap(value, bold, valueSize, width - 24).slice(0, 2)
    lines.forEach((entry, index) =>
      drawText(entry, x + 12, top - 44 - index * (valueSize + 2), { size: valueSize, heavy: true, color: valueColor }),
    )
  }

  function infoRow(label: string, value: string, rowY: number, labelWidth = 150) {
    drawText(label, M, rowY, { size: 8, bold: true, color: MUTED })
    paragraph(value, M + labelWidth, rowY, CONTENT - labelWidth, { size: 9.5, bold: true, leading: 12 })
    line(M, rowY - 12, PAGE[0] - M, rowY - 12, LINE, 0.7)
  }

  // Cover - deliberately minimal, editorial and readable on a phone.
  page = doc.addPage(PAGE)
  pages.push(page)
  rect(0, 0, PAGE[0], PAGE[1], PAPER)
  roundRect(27, 30, PAGE[0] - 54, PAGE[1] - 60, 24, NAVY)
  rect(PAGE[0] - 117, 30, 90, PAGE[1] - 60, BLUE)

  roundRect(58, 730, 145, 57, 12, WHITE)
  if (brandIcon) page.drawImage(brandIcon, { x: 72, y: 744, width: 30, height: 30 })
  const coverWordmarkX = brandIcon ? 111 : 72
  drawText("comb", coverWordmarkX, 761, { size: 18, heavy: true, color: NAVY })
  drawText("invest", coverWordmarkX, 743, { size: 18, heavy: true, color: BLUE })

  roundRect(58, 643, 194, 26, 13, [0.095, 0.18, 0.34])
  drawText("PERSÖNLICHE FINANZANALYSE", 72, 652, { size: 7, bold: true, color: SKY })

  paragraph("Ihre Finanzen.\nKlar auf den Punkt.", 58, 584, 362, {
    size: 34,
    heavy: true,
    color: WHITE,
    leading: 43,
  })
  paragraph("Was Sie heute wissen. Was Sie als Nächstes tun.", 58, 466, 335, {
    size: 13,
    color: [0.82, 0.87, 0.96],
    leading: 19,
  })

  // A simple financial growth motif rather than decorative stock imagery.
  line(450, 320, 450, 576, [0.47, 0.67, 1], 0.8)
  line(477, 320, 477, 576, [0.47, 0.67, 1], 0.8)
  line(504, 320, 504, 576, [0.47, 0.67, 1], 0.8)
  pillBar(441, 341, 18, 78, WHITE)
  pillBar(468, 341, 18, 129, WHITE)
  pillBar(495, 341, 18, 188, WHITE)
  line(443, 444, 476, 489, WHITE, 2.2)
  line(476, 489, 504, 548, WHITE, 2.2)
  page.drawCircle({ x: 443, y: 444, size: 3.4, color: color(WHITE) })
  page.drawCircle({ x: 476, y: 489, size: 3.4, color: color(WHITE) })
  page.drawCircle({ x: 504, y: 548, size: 3.4, color: color(WHITE) })

  roundRect(58, 170, 342, 142, 16, [0.075, 0.137, 0.255])
  drawText("ERSTELLT FÜR", 78, 278, { size: 7, bold: true, color: SKY })
  drawText(data.customerName || "Kundin / Kunde", 78, 239, { size: 23, heavy: true, color: WHITE })
  drawText(`Beratung vom ${fmtDate(data.createdAt)}`, 78, 211, { size: 10, color: [0.78, 0.84, 0.94] })

  drawText("FINANZEN", 58, 91, { size: 7, bold: true, color: SKY })
  drawText("VORSORGE", 133, 91, { size: 7, bold: true, color: SKY })
  drawText("ABSICHERUNG", 221, 91, { size: 7, bold: true, color: SKY })
  drawText("Combinvest AG", 442, 67, { size: 7, bold: true, color: WHITE })

  const ranked = [...(data.areas ?? [])].sort((a, b) => b.score - a.score)
  const completed = ranked.filter((area) => area.status === "done")
  const calculators = Object.entries(data.modules?.calculators ?? {}).filter(([, calculator]) => calculator)
  const contractKeys = Object.keys(data.contracts ?? {})

  // Personal overview
  addPage(
    "Ihre Übersicht",
    "Das Wichtigste auf einen Blick",
    "Dieser Bericht enthält ausschließlich die Punkte, die in Ihrer Beratung erfasst oder berechnet wurden.",
  )
  const cardWidth = (CONTENT - 16) / 3
  metricCard(M, y, cardWidth, "Themen bearbeitet", `${completed.length} von ${ranked.length}`)
  metricCard(M + cardWidth + 8, y, cardWidth, "Berechnungen", String(calculators.length), BLUE)
  metricCard(M + (cardWidth + 8) * 2, y, cardWidth, "Verträge erfasst", String(contractKeys.length))
  y -= 103

  sectionTitle("Ihre Prioritäten", "Die wichtigsten Beratungsthemen")
  ranked.slice(0, 3).forEach((area, index) => {
    ensure(70)
    const top = y
    roundRect(M, top - 58, CONTENT, 58, 10, index === 0 ? PALE : SOFT)
    roundRect(M, top - 58, 7, 58, 3.5, index === 0 ? BLUE : statusColor(area.status))
    drawText(String(index + 1), M + 19, top - 34, { size: 17, heavy: true, color: index === 0 ? BLUE : MUTED })
    drawText(area.name, M + 52, top - 20, { size: 11.5, heavy: true })
    drawText(AREA_COPY[area.key] ?? "Persönlichen Handlungsbedarf gemeinsam prüfen.", M + 52, top - 39, {
      size: 7.5,
      color: MUTED,
      maxWidth: 325,
    })
    roundRect(PAGE[0] - M - 100, top - 40, 82, 22, 11, area.status === "done" ? [0.9, 0.97, 0.93] : PALE)
    drawText(statusLabel(area.status), PAGE[0] - M - 90, top - 32, {
      size: 6.5,
      bold: true,
      color: statusColor(area.status),
    })
    y -= 68
  })

  y -= 8
  sectionTitle("Ihre Angaben", "Persönliche Ausgangslage")
  const profileRows: Array<[string, string]> = [
    ["Kunde", data.customerName],
    ["Geburtsdatum", fmtDate(data.customer?.birthdate)],
    ["Wohnort", [data.customer?.postcode, data.customer?.city].filter(Boolean).join(" ") || "Nicht erfasst"],
    ["Erwerbssituation", answerValue(data, "erwerb")],
    ["Jahresbruttoeinkommen", answerValue(data, "brutto")],
    ["Wohnsituation", answerValue(data, "wohnen")],
    ["Finanzielle Ziele", answerValue(data, "ziele")],
  ].filter(([, value]) => meaningful(value)) as Array<[string, string]>
  profileRows.slice(0, 7).forEach(([label, value]) => {
    ensure(30, "Persönliche Ausgangslage")
    infoRow(label, value, y)
    y -= 30
  })

  // Contracts only when actually captured.
  if (contractKeys.length) {
    addPage(
      "Ihre Verträge",
      "Bestehende Verträge und Abonnemente",
      "Die erfassten Verträge und laufenden Kosten bilden die Grundlage für die weitere Prüfung. Verbindlich bleiben die Originalunterlagen.",
    )
    const annualTotal = contractKeys.reduce((sum, key) => sum + annualPremium(data.contracts[key] ?? {}), 0)
    metricCard(M, y, 242, "Erfasste Verträge", String(contractKeys.length))
    metricCard(M + 258, y, 249, "Kosten pro Jahr", chf(annualTotal), BLUE)
    y -= 104
    drawText("Produkt", M, y, { size: 7, bold: true, color: MUTED })
    drawText("Gesellschaft", M + 150, y, { size: 7, bold: true, color: MUTED })
    drawText("Prämie", M + 330, y, { size: 7, bold: true, color: MUTED })
    y -= 12
    line(M, y, PAGE[0] - M, y)
    y -= 19
    contractKeys.forEach((key) => {
      ensure(44, "Weitere Verträge")
      const contract = data.contracts[key] ?? {}
      drawText(contract.product || key.split("::")[0], M, y, { size: 9, bold: true, maxWidth: 138 })
      drawText(contract.company || "Nicht erfasst", M + 150, y, { size: 8.5, maxWidth: 165 })
      drawText(
        contract.premium != null
          ? `${chf(contract.premium)} / ${INTERVAL_LABEL[contract.interval ?? "monthly"] ?? "Monat"}`
          : "-",
        M + 330,
        y,
        { size: 8.2 },
      )
      if (contract.pol) drawText(`Police ${contract.pol}`, M, y - 15, { size: 6.5, color: MUTED })
      if (contract.abl) drawText(`Ablauf ${contract.abl}`, M + 330, y - 15, { size: 6.5, color: MUTED })
      y -= 39
      line(M, y + 10, PAGE[0] - M, y + 10, LINE, 0.7)
    })
  }

  // One clear, phone-friendly page for every calculation intentionally saved in the analysis.
  calculators.forEach(([key, calculator], index) => {
    const meta = CALCULATOR_META[key] ?? {
      title: key.replace(/[-_]/g, " "),
      eyebrow: "Berechnung aus Ihrer Beratung",
      meaning: "Die gespeicherten Werte zeigen den Stand aus dem gemeinsamen Beratungsgespräch.",
      source: "Persönlich erfasste Angaben",
    }
    const results = calculatorResults(key, calculator)
    const facts = calculatorFacts(key, calculator)
    addPage(
      `${index + 1} von ${calculators.length} Berechnungen`,
      meta.title,
      "Die folgenden Werte wurden während Ihrer Beratung berechnet und ausdrücklich in die Analyse übernommen.",
    )
    drawText(meta.eyebrow.toUpperCase(), M, y, { size: 7, bold: true, color: BLUE })
    const calculationDate = calculator.savedAt ? fmtDate(calculator.savedAt) : fmtDate(data.createdAt)
    drawText(`Berechnet am ${calculationDate}`, PAGE[0] - M - 145, y, { size: 7.5, color: MUTED })
    y -= 27

    const metrics = results.slice(0, 3).map(splitMetric)
    const isSavingsReport = key === "wealth-sparen" && metrics.length >= 3
    if (isSavingsReport) {
      const total = numericCHF(metrics[0].value) ?? 0
      const paid = numericCHF(metrics[1].value) ?? 0
      const interest = numericCHF(metrics[2].value) ?? Math.max(0, total - paid)
      const paidShare = total > 0 ? Math.round((paid / total) * 100) : 0
      const interestShare = total > 0 ? Math.max(0, 100 - paidShare) : 0

      roundRect(M, y - 112, CONTENT, 112, 16, NAVY)
      drawText("VORAUSSICHTLICHES ENDVERMÖGEN", M + 22, y - 27, { size: 7, bold: true, color: SKY })
      drawText(metrics[0].value, M + 22, y - 67, { size: 26, heavy: true, color: WHITE })
      const savingsHorizon = calculator.inputs?.anlagehorizont ?? calculator.inputs?.horizont
      drawText(
        `nach ${meaningful(savingsHorizon) ? `${safe(savingsHorizon)} Jahren` : "dem gewählten Zeitraum"}`,
        M + 22,
        y - 90,
        {
        size: 8.5,
        color: [0.76, 0.83, 0.94],
        },
      )
      drawText(`${interestShare} %`, PAGE[0] - M - 96, y - 53, { size: 20, heavy: true, color: SKY })
      drawText("des Endvermögens", PAGE[0] - M - 126, y - 75, { size: 7.5, color: [0.76, 0.83, 0.94] })
      drawText("entstehen durch Zinsen", PAGE[0] - M - 142, y - 89, { size: 7.5, color: [0.76, 0.83, 0.94] })
      y -= 139

      sectionTitle("Ihre Rechnung", "Einzahlungen und Zinsen")
      const barWidth = CONTENT
      pillBar(M, y - 4, barWidth, 12, LINE)
      if (total > 0) {
        pillBar(M, y - 4, Math.max(12, (barWidth * paid) / total), 12, BLUE)
        const interestWidth = Math.max(12, (barWidth * interest) / total)
        pillBar(M + barWidth - interestWidth, y - 4, interestWidth, 12, MINT)
      }
      y -= 31

      roundRect(M, y - 102, CONTENT, 102, 12, SOFT)
      drawText("BESTANDTEIL", M + 16, y - 20, { size: 6.5, bold: true, color: MUTED })
      drawText("BETRAG", M + 275, y - 20, { size: 6.5, bold: true, color: MUTED })
      drawText("ANTEIL", PAGE[0] - M - 66, y - 20, { size: 6.5, bold: true, color: MUTED })
      line(M + 16, y - 30, PAGE[0] - M - 16, y - 30, LINE, 0.8)
      drawText("Ihre Einzahlungen", M + 16, y - 49, { size: 9, bold: true })
      drawText(metrics[1].value, M + 275, y - 49, { size: 9, heavy: true })
      drawText(`${paidShare} %`, PAGE[0] - M - 62, y - 49, { size: 9, heavy: true, color: BLUE })
      drawText("Ertrag durch Zinsen", M + 16, y - 75, { size: 9, bold: true })
      drawText(metrics[2].value, M + 275, y - 75, { size: 9, heavy: true })
      drawText(`${interestShare} %`, PAGE[0] - M - 62, y - 75, { size: 9, heavy: true, color: GREEN })
      line(M + 16, y - 86, PAGE[0] - M - 16, y - 86, LINE, 0.8)
      drawText("Ihr Endvermögen", M + 16, y - 98, { size: 9, heavy: true, color: NAVY })
      drawText(metrics[0].value, M + 275, y - 98, { size: 9, heavy: true, color: NAVY })
      y -= 126
    } else if (metrics.length) {
      const gap = 8
      const width = (CONTENT - gap * (metrics.length - 1)) / metrics.length
      metrics.forEach((metric, metricIndex) =>
        metricCard(M + metricIndex * (width + gap), y, width, metric.label, metric.value, metricIndex === 0 ? BLUE : PALE),
      )
      y -= 101
    }

    const numericMetrics = results
      .map(splitMetric)
      .map((metric) => ({ ...metric, number: numericCHF(metric.value) }))
      .filter((metric): metric is { label: string; value: string; number: number } => metric.number != null && metric.number >= 0)
      .slice(0, 4)
    if (!isSavingsReport && numericMetrics.length >= 2) {
      sectionTitle("Visueller Vergleich", "Ihre Zahlen im Verhältnis")
      const max = Math.max(...numericMetrics.map((metric) => metric.number), 1)
      numericMetrics.forEach((metric, metricIndex) => {
        ensure(34)
        drawText(metric.label, M, y, { size: 8, bold: true, color: MUTED, maxWidth: 155 })
        pillBar(M + 165, y - 2, 245, 10, LINE)
        pillBar(M + 165, y - 2, Math.max(8, (245 * metric.number) / max), 10, metricIndex === 0 ? BLUE : [0.46, 0.64, 0.94])
        drawText(metric.value, PAGE[0] - M - 80, y, { size: 8, bold: true })
        y -= 28
      })
      y -= 8
    }

    if (facts.length) {
      sectionTitle("Berechnungsgrundlage", "Ihre verwendeten Angaben")
      const columns = facts.length > 4 ? 2 : 1
      const columnWidth = columns === 2 ? (CONTENT - 18) / 2 : CONTENT
      facts.forEach(([label, value], factIndex) => {
        const column = columns === 2 ? factIndex % 2 : 0
        const row = columns === 2 ? Math.floor(factIndex / 2) : factIndex
        const x = M + column * (columnWidth + 18)
        const rowTop = y - row * 42
        roundRect(x, rowTop - 32, columnWidth, 32, 7, SOFT)
        drawText(label.toUpperCase(), x + 10, rowTop - 12, { size: 6, bold: true, color: MUTED })
        drawText(value, x + 10, rowTop - 25, { size: 8.5, bold: true, maxWidth: columnWidth - 20 })
      })
      y -= Math.ceil(facts.length / columns) * 42 + 10
    }

    if (!isSavingsReport) {
      ensure(92)
      roundRect(M, y - 76, CONTENT, 76, 12, PALE)
      roundRect(M, y - 76, 5, 76, 2.5, BLUE)
      drawText("WAS DIESES ERGEBNIS ZEIGT", M + 15, y - 20, { size: 7, bold: true, color: BLUE_DARK })
      paragraph(meta.meaning, M + 15, y - 39, CONTENT - 30, { size: 10, color: NAVY, leading: 14 })
      y -= 93
      drawText(`Grundlage: ${calculator.source || meta.source}`, M, y, { size: 7.5, color: MUTED })
      drawText(`Datenstand ${calculator.calculationYear || 2026}`, PAGE[0] - M - 88, y, {
        size: 7.5,
        bold: true,
        color: MUTED,
      })
    }
  })

  // Closing page
  addPage(
    "Ihr weiterer Weg",
    "Empfehlungen und nächste Schritte",
    "Diese Punkte halten fest, was nach der Beratung weiterverfolgt oder beim nächsten Termin entschieden wird.",
  )
  const nextAreas = ranked.filter((area) => area.status !== "done").slice(0, 5)
  sectionTitle("Empfehlungen", nextAreas.length ? "Das bleibt zu prüfen" : "Ihre Themen sind dokumentiert")
  if (!nextAreas.length) {
    roundRect(M, y - 54, CONTENT, 54, 11, [0.92, 0.98, 0.95])
    drawText("Alle relevanten Themen wurden im aktuellen Beratungsstand bearbeitet.", M + 16, y - 32, {
      size: 10,
      bold: true,
      color: GREEN,
    })
    y -= 72
  } else {
    nextAreas.forEach((area) => {
      ensure(64, "Weitere Empfehlungen")
      roundRect(M, y - 51, 5, 51, 2.5, statusColor(area.status))
      drawText(area.name, M + 17, y - 16, { size: 10.5, bold: true })
      drawText(statusLabel(area.status), PAGE[0] - M - 86, y - 16, {
        size: 7,
        bold: true,
        color: statusColor(area.status),
      })
      paragraph(AREA_COPY[area.key] ?? "Persönlichen Handlungsbedarf gemeinsam prüfen.", M + 17, y - 34, CONTENT - 17, {
        size: 8,
        color: MUTED,
        leading: 11,
      })
      y -= 62
    })
  }

  const appointment = data.modules?.appointment
  if (appointment?.date || appointment?.purpose || appointment?.place) {
    y -= 6
    sectionTitle("Folgetermin", "So geht es weiter")
    const appointmentRows: Array<[string, string]> = [
      ["Datum und Zeit", [fmtDate(appointment.date), appointment.time].filter(Boolean).join(" ")],
      ["Ort oder Kanal", appointment.place ?? ""],
      ["Ziel des Termins", appointment.purpose ?? ""],
    ].filter(([, value]) => meaningful(value)) as Array<[string, string]>
    appointmentRows.forEach(([label, value]) => {
      ensure(34, "Folgetermin")
      infoRow(label, value, y, 130)
      y -= 34
    })
  }

  y -= 8
  sectionTitle("Ihr Ansprechpartner", "Wir begleiten Sie weiter")
  const advisorName =
    data.advisor?.display_name ||
    [data.advisor?.first_name, data.advisor?.last_name].filter(Boolean).join(" ") ||
    "Ihr Combinvest-Berater"
  roundRect(M, y - 76, CONTENT, 76, 13, NAVY)
  drawText(advisorName, M + 17, y - 27, { size: 14, bold: true, color: WHITE })
  drawText(data.advisor?.email || "combinvest.swiss", M + 17, y - 49, { size: 9, color: [0.78, 0.85, 0.96] })
  drawText("COMBINVEST", PAGE[0] - M - 105, y - 28, { size: 8, bold: true, color: [0.55, 0.7, 1] })
  drawText("Finanzen verständlich planen", PAGE[0] - M - 135, y - 48, { size: 7.5, color: [0.78, 0.85, 0.96] })
  y -= 101

  paragraph(
    "Dieser Bericht fasst den gemeinsam erfassten Beratungsstand zusammen. Verbindlich bleiben Originalunterlagen, Policen, Vorsorgeausweise und bestätigte Offerten.",
    M,
    y,
    CONTENT,
    { size: 7.5, color: MUTED, leading: 11 },
  )

  pages.forEach((current, index) => {
    if (index === 0) return
    current.drawLine({
      start: { x: M, y: 37 },
      end: { x: PAGE[0] - M, y: 37 },
      color: color(LINE),
      thickness: 0.7,
    })
    current.drawText("COMBINVEST - PERSÖNLICHE FINANZANALYSE", {
      x: M,
      y: 21,
      size: 6,
      font: bold,
      color: color(MUTED),
    })
    const pageText = `${index} / ${pages.length - 1}`
    current.drawText(pageText, {
      x: PAGE[0] - M - textWidth(pageText, bold, 6),
      y: 21,
      size: 6,
      font: bold,
      color: color(MUTED),
    })
  })

  return doc.save({ useObjectStreams: true })
}

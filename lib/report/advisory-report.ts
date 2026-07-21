import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont, type RGB } from "pdf-lib"

// ---------------------------------------------------------------------------
// Combinvest 8-page advisory report — ported 1:1 from the legacy
// advisory-report.js (browser IIFE) to a server-side pdf-lib module.
// Coordinates and layout math are preserved exactly; only the language changed
// from ES5 globals to typed TypeScript.
// ---------------------------------------------------------------------------

type Col = [number, number, number]

const BLUE: Col = [0.247, 0.486, 0.953]
const NAVY: Col = [0.067, 0.125, 0.239]
const MUTED: Col = [0.39, 0.46, 0.57]
const LINE: Col = [0.86, 0.9, 0.95]
const SOFT: Col = [0.957, 0.972, 0.992]
const PALE: Col = [0.925, 0.953, 1]
const GREEN: Col = [0.09, 0.52, 0.35]
const ORANGE: Col = [0.96, 0.56, 0.25]
const WHITE: Col = [1, 1, 1]

const PAGE: [number, number] = [595.28, 841.89]
const M = 48
const CONTENT = PAGE[0] - M * 2

const AREA_COPY: Record<string, string> = {
  health: "Prämien, Franchise und gewünschte Zusatzdeckungen aufeinander abstimmen.",
  pensiongap: "Leistungen bei Invalidität, Pensionierung und Tod mit dem Zielbedarf vergleichen.",
  investment: "Liquiditätsreserve, Anlagehorizont und passendes Risikoprofil strukturieren.",
  "real-estate": "Eigenkapital, Tragbarkeit und langfristige Finanzierung nachvollziehbar prüfen.",
  "values-protection": "Bestehende Policen auf Lücken, Doppelversicherungen und Abläufe kontrollieren.",
  children: "Versorgung und langfristigen Vermögensaufbau für Kinder absichern.",
  "property-creation": "Einkommensausfall und notwendigen Lebensstandard gegenüberstellen.",
  "tax-advantage": "Steuerpotenzial bei Vorsorge, Vermögen und Wohneigentum gezielt nutzen.",
}

const ANSWER_GROUPS: Array<[string, string[]]> = [
  ["Person und Haushalt", ["geschlecht", "alter", "zivilstand", "kinder", "abhaengige", "wohnen", "plz"]],
  ["Beruf und Finanzen", ["ausbildung", "erwerb", "brutto", "fixkosten"]],
  ["Gesundheit und Alltag", ["sport", "rauchen", "motorfahrzeug", "haustiere", "kk_prio"]],
  ["Ziele und Prioritäten", ["zukunft", "ziele", "konfession"]],
]

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

// --- Report input contract -------------------------------------------------

export type ReportStatus = "open" | "progress" | "done"
export type ReportArea = { key: string; name: string; score: number; status: ReportStatus }
export type ReportAnswer = { id: string; question: string; answer: string }
export type ReportContract = {
  company?: string
  pol?: string
  premium?: number | null
  interval?: string
  abl?: string
  notes?: string
  start?: string
}
export type ReportCalculator = { results?: string[]; calculationYear?: number; source?: string }

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
    documents?: { status?: string }
    appointment?: { date?: string; time?: string }
  }
  notes?: Array<string | { text?: string; note?: string }>
}

// --- Text/number helpers ---------------------------------------------------

function safe(value: unknown): string {
  return String(value == null ? "" : value)
    .replace(/[–—−]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/→/g, ">")
    .replace(/✓/g, "OK")
    .replace(/•/g, "-")
    // eslint-disable-next-line no-control-regex
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
  const n = Number(contract.premium) || 0
  return n * (INTERVAL_FACTOR[contract.interval ?? "monthly"] ?? 12)
}

/**
 * Builds the 8-page advisory report and returns the PDF bytes.
 */
export async function buildAdvisoryReport(data: ReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  doc.setTitle("Combinvest Beratungsbericht - " + safe(data.customerName))
  doc.setAuthor("Combinvest AG")
  doc.setSubject("Zusammenfassung der Finanz- und Risikoanalyse")
  doc.setCreator("Combinvest Beratungsplattform")
  doc.setCreationDate(new Date())

  const pages: PDFPage[] = []
  const ctx: { page: PDFPage; y: number; section: string } = {
    page: null as unknown as PDFPage,
    y: 0,
    section: "",
  }

  const color = (c: Col): RGB => rgb(c[0], c[1], c[2])
  function rect(x: number, y: number, w: number, h: number, fill?: Col, border?: Col, width?: number) {
    ctx.page.drawRectangle({
      x,
      y,
      width: w,
      height: h,
      color: fill ? color(fill) : undefined,
      borderColor: border ? color(border) : undefined,
      borderWidth: width || 0,
    })
  }
  function line(x1: number, y1: number, x2: number, y2: number, c?: Col, w?: number) {
    ctx.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color: color(c || LINE), thickness: w || 1 })
  }
  function textWidth(text: string, font: PDFFont, size: number): number {
    return font.widthOfTextAtSize(safe(text), size)
  }
  function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const words = safe(text).split(" ")
    const lines: string[] = []
    let current = ""
    words.forEach((word) => {
      const next = current ? current + " " + word : word
      if (textWidth(next, font, size) <= maxWidth || !current) current = next
      else {
        lines.push(current)
        current = word
      }
    })
    if (current) lines.push(current)
    return lines.length ? lines : [""]
  }
  type TextOpts = { size?: number; bold?: boolean; color?: Col; maxWidth?: number; leading?: number }
  function drawText(text: string, x: number, y: number, opts: TextOpts = {}) {
    ctx.page.drawText(safe(text), {
      x,
      y,
      size: opts.size || 10,
      font: opts.bold ? bold : regular,
      color: color(opts.color || NAVY),
      maxWidth: opts.maxWidth,
    })
  }
  function paragraph(text: string, x: number, y: number, maxWidth: number, opts: TextOpts = {}): number {
    const size = opts.size || 10
    const leading = opts.leading || size * 1.45
    const lines = wrap(text, opts.bold ? bold : regular, size, maxWidth)
    lines.forEach((value, index) => {
      drawText(value, x, y - index * leading, { size, bold: opts.bold, color: opts.color })
    })
    return y - lines.length * leading
  }
  function brand(page: PDFPage, y: number, dark: boolean) {
    page.drawText("comb", { x: M, y, size: 15, font: bold, color: color(dark ? WHITE : NAVY) })
    page.drawText("invest", { x: M + 37, y, size: 15, font: bold, color: color(dark ? WHITE : BLUE) })
  }
  function addPage(section: string, title?: string, intro?: string): PDFPage {
    ctx.page = doc.addPage(PAGE)
    pages.push(ctx.page)
    ctx.section = section || "BERATUNGSBERICHT"
    brand(ctx.page, 803, false)
    drawText(ctx.section.toUpperCase(), PAGE[0] - M - 180, 806, { size: 7, bold: true, color: BLUE })
    line(M, 789, PAGE[0] - M, 789, LINE, 1)
    ctx.y = 754
    if (title) {
      drawText(title, M, ctx.y, { size: 25, bold: true })
      ctx.y -= 34
    }
    if (intro) {
      ctx.y = paragraph(intro, M, ctx.y, CONTENT, { size: 10, color: MUTED, leading: 15 }) - 15
    }
    return ctx.page
  }
  function ensure(height: number, title?: string) {
    if (ctx.y - height < 58) addPage(ctx.section, title || "Fortsetzung")
  }
  function sectionTitle(kicker: string, title: string, desc?: string) {
    ensure(72)
    drawText(kicker.toUpperCase(), M, ctx.y, { size: 7, bold: true, color: BLUE })
    ctx.y -= 18
    drawText(title, M, ctx.y, { size: 18, bold: true })
    ctx.y -= 19
    if (desc) ctx.y = paragraph(desc, M, ctx.y, CONTENT, { size: 9, color: MUTED, leading: 13 }) - 10
  }
  function miniCard(x: number, y: number, w: number, h: number, label: string, value: string, sub?: string, accent?: Col) {
    rect(x, y - h, w, h, accent || SOFT, accent ? accent : LINE, accent ? 0 : 1)
    drawText(label.toUpperCase(), x + 13, y - 18, { size: 6.5, bold: true, color: accent ? WHITE : MUTED })
    drawText(value, x + 13, y - 42, { size: 18, bold: true, color: accent ? WHITE : NAVY })
    if (sub) paragraph(sub, x + 13, y - 58, w - 26, { size: 7.5, color: accent ? WHITE : MUTED, leading: 10 })
  }
  const statusLabel = (status: string) =>
    status === "done" ? "Abgeschlossen" : status === "progress" ? "In Bearbeitung" : "Offen"
  const statusColor = (status: string): Col => (status === "done" ? GREEN : status === "progress" ? ORANGE : MUTED)

  // --- Cover ---------------------------------------------------------------
  ctx.page = doc.addPage(PAGE)
  pages.push(ctx.page)
  rect(0, 0, PAGE[0], PAGE[1], NAVY)
  rect(0, 0, 20, PAGE[1], BLUE)
  rect(360, 0, 235, PAGE[1], BLUE)
  rect(390, 610, 170, 170, PALE)
  rect(420, 640, 110, 110, WHITE)
  brand(ctx.page, 785, true)
  drawText("PERSÖNLICHE FINANZ- UND RISIKOANALYSE", M, 690, { size: 8, bold: true, color: WHITE })
  paragraph("Klarheit für Ihre nächsten finanziellen Entscheidungen.", M, 645, 285, {
    size: 29,
    bold: true,
    color: WHITE,
    leading: 35,
  })
  line(M, 495, 320, 495, WHITE, 1)
  drawText(safe(data.customerName) || "Kundin / Kunde", M, 462, { size: 18, bold: true, color: WHITE })
  drawText("Beratung vom " + fmtDate(data.createdAt), M, 438, { size: 10, color: [0.82, 0.88, 0.98] })
  drawText("Vertraulich", M, 76, { size: 8, bold: true, color: [0.82, 0.88, 0.98] })
  drawText("Analyse-ID " + safe(data.analysisId).slice(0, 24), M, 58, { size: 7, color: [0.72, 0.8, 0.93] })
  drawText("combinvest", 402, 699, { size: 17, bold: true, color: BLUE })
  drawText("BERATUNGSBERICHT", 401, 673, { size: 7, bold: true, color: NAVY })

  // --- 01 Executive summary ------------------------------------------------
  addPage(
    "01 / Überblick",
    "Ihre Beratung auf einen Blick",
    "Die wichtigsten Erkenntnisse, Prioritäten und nächsten Schritte für Kunde und Innendienst.",
  )
  const ranked = (data.areas || []).slice().sort((a, b) => b.score - a.score)
  const done = ranked.filter((a) => a.status === "done").length
  miniCard(M, ctx.y, 155, 82, "Profiling", (data.answerCount || 0) + " / " + (data.questionCount || 19), "Fragen beantwortet")
  miniCard(M + 172, ctx.y, 155, 82, "Themen", done + " / " + ranked.length, "Bereiche abgeschlossen")
  miniCard(M + 344, ctx.y, 155, 82, "Verträge", String(Object.keys(data.contracts || {}).length), "Bestehende Produkte")
  ctx.y -= 108
  sectionTitle(
    "Höchste Relevanz",
    "Drei zentrale Beratungsfelder",
    "Diese Rangfolge basiert auf den Antworten im Financial Profiling.",
  )
  ranked.slice(0, 3).forEach((item, index) => {
    ensure(66)
    rect(M, ctx.y - 52, CONTENT, 52, index === 0 ? PALE : SOFT, index === 0 ? BLUE : LINE, 1)
    drawText(String(index + 1), M + 14, ctx.y - 31, { size: 17, bold: true, color: index === 0 ? BLUE : MUTED })
    drawText(item.name, M + 48, ctx.y - 20, { size: 11, bold: true })
    drawText(AREA_COPY[item.key] || "Persönlichen Handlungsbedarf prüfen.", M + 48, ctx.y - 37, {
      size: 7.5,
      color: MUTED,
    })
    drawText(item.score + " / 5", PAGE[0] - M - 67, ctx.y - 24, { size: 12, bold: true, color: statusColor(item.status) })
    drawText(statusLabel(item.status), PAGE[0] - M - 86, ctx.y - 40, { size: 6.5, color: MUTED })
    ctx.y -= 62
  })
  ctx.y -= 10
  sectionTitle(
    "Beratungskontext",
    "Kunde und Beratung",
    "Die Angaben dienen der eindeutigen Zuordnung und internen Weiterbearbeitung.",
  )
  const customer = data.customer || {}
  const advisor = data.advisor || {}
  const infoRows: Array<[string, string]> = [
    ["Kunde", data.customerName],
    ["Geburtsdatum", fmtDate(customer.birthdate)],
    ["Kontakt", [customer.email, customer.phone].filter(Boolean).join(" · ") || "Nicht erfasst"],
    ["Wohnort", [customer.postcode, customer.city].filter(Boolean).join(" ") || "Nicht erfasst"],
    [
      "Kundenberater",
      advisor.display_name || [advisor.first_name, advisor.last_name].filter(Boolean).join(" ") || "Nicht erfasst",
    ],
    ["Beraterkontakt", advisor.email || "Nicht erfasst"],
  ]
  infoRows.forEach((row, index) => {
    const y = ctx.y - index * 25
    drawText(row[0], M, y, { size: 7, bold: true, color: MUTED })
    drawText(row[1], M + 126, y, { size: 9, bold: index === 0 })
    line(M, y - 9, PAGE[0] - M, y - 9, LINE, 0.7)
  })
  ctx.y -= infoRows.length * 25 + 8

  // --- 02 Financial profiling ---------------------------------------------
  addPage(
    "02 / Financial Profiling",
    "Persönliche Ausgangslage",
    "Die Antworten wurden thematisch gebündelt, damit die Ausgangslage schnell nachvollziehbar bleibt.",
  )
  const answerMap: Record<string, ReportAnswer> = {}
  ;(data.answers || []).forEach((item) => {
    answerMap[item.id] = item
  })
  ANSWER_GROUPS.forEach((group) => {
    ensure(55 + group[1].length * 24, group[0])
    drawText(group[0], M, ctx.y, { size: 13, bold: true })
    ctx.y -= 15
    group[1].forEach((id) => {
      const item = answerMap[id]
      if (!item) return
      drawText(item.question, M, ctx.y, { size: 7.5, color: MUTED, maxWidth: 245 })
      const lines = wrap(item.answer || "Nicht beantwortet", bold, 8.2, 230)
      lines.slice(0, 2).forEach((t, i) => {
        drawText(t, M + 268, ctx.y - i * 10, { size: 8.2, bold: true })
      })
      ctx.y -= Math.max(24, lines.length * 10 + 8)
      line(M, ctx.y + 7, PAGE[0] - M, ctx.y + 7, LINE, 0.6)
    })
    ctx.y -= 15
  })

  // --- 03 Risk profile -----------------------------------------------------
  addPage(
    "03 / Risikoanalyse",
    "Relevanz und Bearbeitungsstand",
    "Die Skala zeigt den relativen Beratungsbedarf von 1 (tief) bis 5 (sehr hoch). Sie ist keine Produktbewertung.",
  )
  ranked.forEach((item, index) => {
    ensure(72)
    const y = ctx.y
    drawText(String(index + 1).padStart(2, "0"), M, y, { size: 8, bold: true, color: MUTED })
    drawText(item.name, M + 30, y, { size: 11, bold: true })
    drawText(statusLabel(item.status), PAGE[0] - M - 95, y, { size: 7, bold: true, color: statusColor(item.status) })
    const barX = M + 30
    const barY = y - 24
    const barW = 235
    rect(barX, barY, barW, 8, LINE)
    rect(barX, barY, (barW * Math.max(0, Math.min(5, item.score))) / 5, 8, item.score >= 4 ? BLUE : item.score === 3 ? ORANGE : MUTED)
    drawText(item.score + " / 5", barX + barW + 12, barY, { size: 8, bold: true })
    paragraph(AREA_COPY[item.key] || "Persönlichen Handlungsbedarf prüfen.", M + 30, y - 42, CONTENT - 30, {
      size: 7.5,
      color: MUTED,
      leading: 10,
    })
    ctx.y -= 70
  })

  // --- 04 Contracts --------------------------------------------------------
  addPage(
    "04 / Vertragscheck",
    "Bestehende Verträge",
    "Erfasste Produkte als Arbeitsgrundlage für Prüfung, Rückfragen und allfällige Offerten.",
  )
  const contractKeys = Object.keys(data.contracts || {})
  const annualTotal = contractKeys.reduce((sum, key) => sum + annualPremium(data.contracts[key] || {}), 0)
  miniCard(M, ctx.y, 240, 75, "Erfasste Produkte", String(contractKeys.length), "Vertragspositionen")
  miniCard(M + 258, ctx.y, 241, 75, "Prämienvolumen", chf(annualTotal), "Hochrechnung pro Jahr")
  ctx.y -= 100
  if (!contractKeys.length) {
    paragraph("Im Vertragscheck wurden noch keine bestehenden Produkte erfasst.", M, ctx.y, CONTENT, {
      size: 10,
      color: MUTED,
    })
    ctx.y -= 30
  } else {
    ;([
      ["Produkt", 0],
      ["Gesellschaft", 140],
      ["Prämie", 310],
      ["Ablauf", 407],
    ] as Array<[string, number]>).forEach((h) => {
      drawText(h[0], M + h[1], ctx.y, { size: 7, bold: true, color: MUTED })
    })
    ctx.y -= 15
    line(M, ctx.y, PAGE[0] - M, ctx.y, LINE, 1)
    ctx.y -= 15
    contractKeys.forEach((key) => {
      ensure(44, "Bestehende Verträge")
      const c = data.contracts[key] || {}
      drawText(key, M, ctx.y, { size: 8.5, bold: true, maxWidth: 130 })
      drawText(c.company || "Nicht erfasst", M + 140, ctx.y, { size: 8, maxWidth: 155 })
      drawText(
        c.premium != null ? chf(c.premium) + " / " + (INTERVAL_LABEL[c.interval ?? "monthly"] || "Monat") : "-",
        M + 310,
        ctx.y,
        { size: 7.5 },
      )
      drawText(c.abl || "-", M + 407, ctx.y, { size: 8 })
      if (c.pol) drawText("Police " + c.pol, M, ctx.y - 14, { size: 6.5, color: MUTED })
      if (c.notes) drawText(c.notes, M + 140, ctx.y - 14, { size: 6.5, color: MUTED, maxWidth: 260 })
      ctx.y -= 35
      line(M, ctx.y + 9, PAGE[0] - M, ctx.y + 9, LINE, 0.6)
    })
  }

  // --- 05 Calculators ------------------------------------------------------
  addPage(
    "05 / Berechnungen",
    "Ergebnisse aus der Beratung",
    "Nur tatsächlich gespeicherte Rechner und Bedarfschecks werden in diesem Abschnitt dokumentiert.",
  )
  const modules = data.modules || {}
  let hasModule = false
  function resultBlock(title: string, source: string, metrics: Array<[string, string, string?]>, description?: string) {
    hasModule = true
    ensure(105, title)
    drawText(title, M, ctx.y, { size: 13, bold: true })
    drawText(source, M, ctx.y - 14, { size: 6.5, color: MUTED })
    ctx.y -= 30
    const count = Math.min(3, metrics.length)
    const w = (CONTENT - (count - 1) * 8) / Math.max(1, count)
    metrics.slice(0, 3).forEach((metric, index) => {
      miniCard(M + index * (w + 8), ctx.y, w, 62, metric[0], metric[1], metric[2] || "")
    })
    ctx.y -= 74
    if (description) {
      ctx.y = paragraph(description, M, ctx.y, CONTENT, { size: 8, color: MUTED, leading: 12 }) - 14
    }
  }
  Object.keys(modules.calculators || {})
    .slice(0, 6)
    .forEach((key) => {
      const c = (modules.calculators || {})[key]
      if (!c || !Array.isArray(c.results) || !c.results.length) return
      resultBlock(
        CALC_TITLES[key] || "Rechner: " + key,
        c.source || "Stand " + (c.calculationYear || 2026),
        c.results.slice(0, 3).map((value, index) => ["Ergebnis " + (index + 1), safe(value).slice(0, 42), ""] as [string, string, string]),
        CALC_NOTES[key] || "",
      )
    })
  if (!hasModule) {
    paragraph("Es wurden noch keine Rechnerresultate ausdrücklich in diese Analyse übernommen.", M, ctx.y, CONTENT, {
      size: 10,
      color: MUTED,
    })
  }

  // --- 06 Recommendations --------------------------------------------------
  addPage(
    "06 / Empfehlungen",
    "Empfehlungen und nächste Schritte",
    "Der Bericht trennt zwischen abgeschlossenen, laufenden und offenen Beratungsthemen.",
  )
  ranked.forEach((item) => {
    ensure(61)
    const st = item.status || "open"
    const c = statusColor(st)
    rect(M, ctx.y - 49, 5, 49, c)
    drawText(item.name, M + 17, ctx.y - 16, { size: 10, bold: true })
    drawText(statusLabel(st), PAGE[0] - M - 91, ctx.y - 16, { size: 7, bold: true, color: c })
    paragraph(AREA_COPY[item.key] || "Persönlichen Handlungsbedarf prüfen.", M + 17, ctx.y - 32, CONTENT - 17, {
      size: 7.5,
      color: MUTED,
      leading: 10,
    })
    ctx.y -= 59
  })

  // --- 07 Handover ---------------------------------------------------------
  addPage(
    "07 / Innendienst",
    "Übergabe und Vollständigkeitskontrolle",
    "Kompakte Arbeitsgrundlage für Nachbearbeitung, Dokumentation und Folgetermin.",
  )
  const checklist: Array<[string, string]> = [
    ["Kundendaten und Identität", data.customerName ? "Vorhanden" : "Prüfen"],
    ["Financial Profiling", (data.answerCount || 0) === (data.questionCount || 19) ? "Vollständig" : "Unvollständig"],
    ["Vertragscheck", contractKeys.length ? contractKeys.length + " Produkte" : "Keine Verträge erfasst"],
    ["Risikoanalyse", done + " von " + ranked.length + " Themen abgeschlossen"],
    ["Rechnerresultate", hasModule ? "Im Bericht enthalten" : "Keine übernommen"],
    ["Beratungsdokumente", modules.documents && modules.documents.status ? modules.documents.status : "Separat prüfen"],
    [
      "Nächster Termin",
      modules.appointment && modules.appointment.date
        ? fmtDate(modules.appointment.date) + " " + (modules.appointment.time || "")
        : "Noch nicht erfasst",
    ],
  ]
  checklist.forEach((item, index) => {
    const y = ctx.y - index * 38
    const ok = /Vorhanden|Vollständig|enthalten|abgeschlossen|Produkte/.test(item[1])
    rect(M, y - 25, 24, 24, ok ? GREEN : SOFT, ok ? GREEN : LINE, 1)
    drawText(ok ? "OK" : "!", M + (ok ? 5 : 9), y - 18, { size: 8, bold: true, color: ok ? WHITE : ORANGE })
    drawText(item[0], M + 38, y - 9, { size: 9, bold: true })
    drawText(item[1], M + 250, y - 9, { size: 8, color: ok ? GREEN : MUTED })
    line(M + 38, y - 25, PAGE[0] - M, y - 25, LINE, 0.6)
  })
  ctx.y -= checklist.length * 38 + 12
  sectionTitle("Notizen", "Beratungsnotizen")
  let noteText = (data.notes || [])
    .map((n) => (typeof n === "string" ? n : n.text || n.note || ""))
    .filter(Boolean)
    .join("\n")
  if (!noteText) noteText = "Keine zusätzlichen Beratungsnotizen erfasst."
  noteText
    .split(/\n+/)
    .slice(0, 10)
    .forEach((note) => {
      ensure(28)
      drawText("-", M, ctx.y, { size: 9, bold: true, color: BLUE })
      ctx.y = paragraph(note, M + 15, ctx.y, CONTENT - 15, { size: 8.5, color: MUTED, leading: 12 }) - 6
    })

  // --- 08 Methodology ------------------------------------------------------
  addPage(
    "08 / Dokumentation",
    "Hinweise und Berechnungsgrundlagen",
    "Transparenz zu Datenstand, Aussagekraft und weiterer Verwendung dieses Berichts.",
  )
  const legal: Array<[string, string]> = [
    [
      "Zweck des Berichts",
      "Dieser Bericht fasst die im Beratungsgespräch erfassten Angaben, Prioritäten, Verträge und ausgewählten Rechnerresultate zusammen. Er unterstützt Kunde, Berater und Innendienst bei der Nachbearbeitung.",
    ],
    [
      "Datenqualität",
      "Die Resultate hängen von der Vollständigkeit und Richtigkeit der Kundendaten sowie von vorhandenen Originalunterlagen ab. Schätzungen und automatisch berechnete Werte sind als solche im jeweiligen Rechner kenntlich gemacht.",
    ],
    [
      "Versicherungen und Vorsorge",
      "Verbindlich sind Policen, Versicherungsbedingungen, Vorsorgeausweise sowie Entscheide der zuständigen Versicherer, Vorsorgeeinrichtungen und Behörden.",
    ],
    [
      "Keine Produktzusage",
      "Empfehlungen in diesem Bericht sind Beratungs- und Prüfaufträge. Eine Annahme, Leistung, Prämie oder Rendite ist erst nach Prüfung und Bestätigung durch den jeweiligen Anbieter verbindlich.",
    ],
    [
      "Vertraulichkeit",
      "Das Dokument enthält Personendaten und ist vertraulich zu behandeln. Die Zustellung an Dritte erfolgt nur im Rahmen des Beratungsauftrags und der anwendbaren Datenschutzvorgaben.",
    ],
  ]
  legal.forEach((item) => {
    ensure(95)
    drawText(item[0], M, ctx.y, { size: 11, bold: true })
    ctx.y = paragraph(item[1], M, ctx.y - 18, CONTENT, { size: 8.5, color: MUTED, leading: 13 }) - 18
  })
  drawText("Erstellt mit der Combinvest Beratungsplattform · Datenstand 2026", M, 70, { size: 7, bold: true, color: BLUE })

  // --- Footers -------------------------------------------------------------
  pages.forEach((page, index) => {
    if (index === 0) return
    page.drawLine({ start: { x: M, y: 38 }, end: { x: PAGE[0] - M, y: 38 }, color: color(LINE), thickness: 0.7 })
    page.drawText("COMBINVEST · VERTRAULICH", { x: M, y: 22, size: 6, font: bold, color: color(MUTED) })
    const pageText = index + " / " + (pages.length - 1)
    page.drawText(pageText, {
      x: PAGE[0] - M - textWidth(pageText, bold, 6),
      y: 22,
      size: 6,
      font: bold,
      color: color(MUTED),
    })
  })

  return doc.save({ useObjectStreams: true })
}

// Friendly titles/notes for the calculators we persist via CalcActionBar.
const CALC_TITLES: Record<string, string> = {
  "pension-gap": "Vorsorgelückenanalyse",
  "health-franchise": "Franchise-Vergleich",
  "real-estate-affordability": "Tragbarkeit Wohneigentum",
}
const CALC_NOTES: Record<string, string> = {
  "pension-gap":
    "Richtwerte nach AHV-Skala 44 und BVG-Minimum. Verbindlich sind die Ausweise und Entscheide der zuständigen Einrichtungen.",
  "health-franchise":
    "Szenarioberechnung mit den erfassten Gesundheitskosten (BAG / Priminfo 2026). Prämienverbilligung und Sonderfälle sind nicht eingerechnet.",
  "real-estate-affordability":
    "Kalkulatorische Tragbarkeit nach Schweizer Standard (5 % Zins, 1 % Nebenkosten, 33 %-Regel). Verbindlich sind die Konditionen des Finanzierungsinstituts.",
}

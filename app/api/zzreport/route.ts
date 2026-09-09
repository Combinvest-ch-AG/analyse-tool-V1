import { NextResponse } from "next/server"
import { buildAdvisoryReport, type ReportData } from "@/lib/report/advisory-report"

export const dynamic = "force-dynamic"

// TEMP diagnostic route to visually verify the advisory PDF layout. Removed after review.
export async function GET() {
  const data: ReportData = {
    customerName: "Andrea Muster-Bianchi",
    createdAt: new Date().toISOString(),
    analysisId: "demo",
    answerCount: 18,
    questionCount: 22,
    areas: [
      { key: "health", name: "Gesundheit & Krankenkasse", score: 0.8, status: "done" },
      { key: "pensiongap", name: "Vorsorge & Einkommensschutz", score: 0.7, status: "done" },
      { key: "investment", name: "Vermögen & Anlagen", score: 0.6, status: "progress" },
      { key: "real-estate", name: "Wohneigentum", score: 0.5, status: "progress" },
      { key: "tax-advantage", name: "Steuern optimieren", score: 0.4, status: "open" },
    ],
    contracts: {
      "Privathaftpflicht::AXA": { product: "Privathaftpflicht", company: "AXA", pol: "12.884.221", premium: 18, interval: "monthly", abl: "31.12.2027" },
      "3a Police::Swiss Life": { product: "Säule 3a Police", company: "Swiss Life", pol: "SL-99182", premium: 250, interval: "monthly" },
    },
    customer: { birthdate: "1986-04-12", email: "a@example.ch", phone: "079 000 00 00", postcode: "8002", city: "Zürich" },
    advisor: { display_name: "Marco Berater", email: "marco@combinvest.swiss" },
    answers: [
      { id: "zivilstand", question: "Zivilstand", answer: "Verheiratet" },
      { id: "kinder", question: "Kinder", answer: "2 Kinder (8, 11)" },
      { id: "erwerb", question: "Erwerbssituation", answer: "Angestellt, 90 %" },
      { id: "beruf", question: "Beruf", answer: "Projektleiterin" },
      { id: "brutto", question: "Jahresbruttoeinkommen", answer: "CHF 118'000" },
      { id: "wohnen", question: "Wohnsituation", answer: "Miete, 4.5 Zimmer" },
    ],
    modules: {
      calculators: {
        budget: {
          results: ["Einkommen: CHF 8'500", "Ausgaben: CHF 6'250", "Überschuss: CHF 2'250"],
          inputs: {
            data: {
              income: [{ name: "Lohn", amount: 8000 }, { name: "Nebeneinkommen", amount: 500 }],
              cats: [
                { name: "Fixkosten", color: "#ee6a20", subs: [{ name: "Miete", amount: 2200 }, { name: "Steuern", amount: 900 }, { name: "Versicherungen", amount: 450 }] },
                { name: "Leben", color: "#256abf", subs: [{ name: "Essen", amount: 900 }, { name: "Transport", amount: 350 }, { name: "Freizeit", amount: 500 }] },
                { name: "Sparen", color: "#159b8a", subs: [{ name: "Säule 3a", amount: 300 }, { name: "Wertschriften", amount: 200 }] },
              ],
            },
          },
          savedAt: new Date().toISOString(),
        },
        "real-estate-affordability": {
          results: ["Bank-Tragbarkeit: 31.5 %", "Eigenmittel: CHF 240'000", "1. Hypothek: CHF 640'000", "2. Hypothek: CHF 120'000", "Effektive Eigentümerkosten: CHF 2'950", "Liquiditätsabfluss: CHF 3'400", "Vergleichsmiete: CHF 3'100", "Tragbar"],
          inputs: { kaufpreis: 1000000, eigenkapital: 240000, bruttoeinkommen: 145000 },
          savedAt: new Date().toISOString(),
        },
        "pension-gap": {
          results: ["Ziel: CHF 84'000", "Vorhandene Leistungen: CHF 61'000", "Deckungslücke: CHF 23'000", "Deckung: 73 %"],
          inputs: { risk: "iv", salary: 118000, targetPct: 90, age: 39 },
          savedAt: new Date().toISOString(),
        },
        "health-franchise": {
          results: ["Beste Franchise: CHF 2'500", "Jahreskosten: CHF 3'480", "Ersparnis: CHF 540"],
          inputs: { ort: "Zürich", geburtsjahr: 1986, versicherer: "CSS", tarif: "Hausarzt", unfalldeckung: "Mit Unfall", gesundheitskosten: 900 },
          savedAt: new Date().toISOString(),
        },
        "wealth-sparen": {
          results: ["Endvermögen: CHF 182'400", "Einzahlungen: CHF 120'000", "Zinsertrag: CHF 62'400"],
          inputs: { startkapital: 20000, sparrate_monat: 500, anlagehorizont: 20, rendite_pa: 4 },
          savedAt: new Date().toISOString(),
        },
        anlegerprofil: {
          profile: "Ausgewogen",
          score: 62,
          equity: 55,
          savedAt: new Date().toISOString(),
        },
      },
      appointment: { date: "2026-10-01", time: "14:00", place: "Combinvest Zürich", purpose: "Umsetzung Vorsorge & Franchise" },
    },
    notes: ["Kundin möchte Säule 3a erhöhen.", "Franchise-Wechsel per 1.1. prüfen."],
  }
  const bytes = await buildAdvisoryReport(data, "de")
  return new NextResponse(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline; filename=demo.pdf" },
  })
}

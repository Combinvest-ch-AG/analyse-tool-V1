// Data-driven definition of the Combinvest "Finanzstatus Check" wizard.
// Ported 1:1 from the legacy analyse.html so the deterministic relevance
// engine, the 19-question flow, the contract check and the risk cockpit all
// stay faithful to the original advisory tool.

export type FieldType = "single" | "multi" | "slider" | "text"

export type Option = [value: string, label: string]

export type Question = {
  id: string
  t: string
  sub?: string
  type: FieldType
  opts?: Option[]
  exclusive?: string
  min?: number
  max?: number
  step?: number
  def?: number
  fmt?: (v: number) => string
  placeholder?: string
  inputmode?: "numeric" | "text"
  maxlength?: number
}

const chf = (v: number) => "CHF " + Number(v).toLocaleString("de-CH")

/* =============== Fragenkatalog (19 Fragen) =============== */
export const QUESTIONS: Question[] = [
  { id: "geschlecht", t: "Geschlecht", type: "single", opts: [["M", "Männlich"], ["W", "Weiblich"]] },
  { id: "alter", t: "Wann sind Sie geboren?", sub: "Ihr Alter in Jahren", type: "slider", min: 18, max: 80, def: 35, fmt: (v) => v + " Jahre" },
  { id: "sport", t: "Betreiben Sie regelmässig Sport?", type: "single", opts: [["nein", "Nein"], ["gelegentlich", "Gelegentlich"], ["regelmaessig", "Regelmässig"]] },
  { id: "rauchen", t: "Rauchen Sie?", type: "single", opts: [["nein", "Nein"], ["ja", "Ja"]] },
  { id: "zivilstand", t: "Zivilstand", type: "single", opts: [["ledig", "Ledig"], ["partnerschaft", "Partnerschaft"], ["verheiratet", "Verheiratet"], ["geschieden", "Geschieden"]] },
  { id: "kinder", t: "Haben Sie Kinder?", type: "single", opts: [["nein", "Nein"], ["ja", "Ja"]] },
  {
    id: "abhaengige", t: "Sind Personen finanziell von Ihnen abhängig?", sub: "Mehrfachauswahl möglich", type: "multi",
    opts: [["nein", "Nein"], ["partner", "Partner/in"], ["kinder", "Kinder"], ["andere", "Andere"]], exclusive: "nein",
  },
  { id: "motorfahrzeug", t: "Motorfahrzeug vorhanden?", type: "single", opts: [["nein", "Nein"], ["ja", "Ja"]] },
  { id: "haustiere", t: "Haustiere?", type: "single", opts: [["nein", "Nein"], ["ja", "Ja"]] },
  { id: "wohnen", t: "Wohnsituation", type: "single", opts: [["miete", "Miete"], ["eigentum", "Eigentum"], ["familie", "Bei Familie"]] },
  { id: "plz", t: "Wie lautet Ihre Adresse?", sub: "Postleitzahl genügt", type: "text", placeholder: "z. B. 3250", inputmode: "numeric", maxlength: 4 },
  { id: "ausbildung", t: "Höchste Ausbildung", type: "single", opts: [["obligatorisch", "Obligatorisch"], ["lehre", "Lehre / EFZ"], ["hf", "HF / FH"], ["uni", "Universität"]] },
  { id: "konfession", t: "Konfession", type: "single", opts: [["keine", "Keine"], ["christlich", "Christlich"], ["muslimisch", "Muslimisch"], ["andere", "Andere"]] },
  { id: "erwerb", t: "Erwerbssituation", type: "single", opts: [["angestellt", "Angestellt"], ["selbstaendig", "Selbständig"], ["student", "Student"], ["keine", "Nicht erwerbstätig"]] },
  { id: "brutto", t: "Jahresbruttoeinkommen", sub: "Brutto pro Jahr in CHF", type: "slider", min: 0, max: 400000, step: 5000, def: 90000, fmt: chf },
  {
    id: "kk_prio", t: "Krankenversicherung — was ist Ihnen wichtig?", sub: "Mehrfachauswahl möglich", type: "multi",
    opts: [["arztwahl", "Freie Arztwahl"], ["spitalwahl", "Freie Spitalwahl (CH)"], ["privat", "Privat / Halbprivat"], ["preis", "Bestes Preis-Leistungs-Verhältnis"], ["deckung", "Maximale Deckung"]],
  },
  {
    id: "zukunft", t: "Finanzielle Zukunft — was ist Ihnen wichtig?", sub: "Mehrfachauswahl möglich", type: "multi",
    opts: [["einkommensverluste", "Geringe Einkommensverluste"], ["staat", "Unabhängig vom Staat"], ["familie", "Unabhängig von Familie"], ["lebensstandard", "Lebensstandard sichern"], ["vermoegen", "Vermögen ausbauen"]],
  },
  {
    id: "ziele", t: "Finanzielle Ziele", sub: "Mehrfachauswahl möglich", type: "multi",
    opts: [["vermoegensaufbau", "Vermögensaufbau"], ["eigenheim", "Eigenheim"], ["rendite", "Renditeobjekt"], ["fruehpension", "Frühpensionierung"], ["steuer", "Steueroptimierung"], ["freiheit", "Finanzielle Freiheit"]],
  },
  { id: "fixkosten", t: "Wie lange könnten Sie Ihre Fixkosten ohne Einkommen decken?", type: "single", opts: [["unter3", "Unter 3 Monate"], ["3bis6", "3–6 Monate"], ["ueber6", "Über 6 Monate"]] },
]

export const TOTAL_QUESTIONS = QUESTIONS.length

/* =============== Relevanz-Modell (transparent, 0–5) =============== */
export type AreaKey =
  | "health" | "pensiongap" | "investment" | "real-estate"
  | "values-protection" | "children" | "property-creation" | "tax-advantage"

export type Area = {
  key: AreaKey
  name: string
  image: string
  recommendation: string
}

export const AREAS: Area[] = [
  { key: "health", name: "Gesundheit", image: "/assets/risk/health.webp", recommendation: "Franchise, Versicherungsmodell und Gesundheitskosten gemeinsam prüfen." },
  { key: "pensiongap", name: "Vorsorge", image: "/assets/risk/pension.webp", recommendation: "Leistungen bei Invalidität, Pensionierung und Tod der gewünschten Absicherung gegenüberstellen." },
  { key: "investment", name: "Vermögen aufbauen", image: "/assets/risk/investment.webp", recommendation: "Liquiditätsreserve, Anlagehorizont und geeignetes Risikoprofil bestimmen." },
  { key: "real-estate", name: "Immobilien", image: "/assets/risk/real-estate.webp", recommendation: "Eigenkapital, Tragbarkeit und langfristige Finanzierung beurteilen." },
  { key: "values-protection", name: "Versicherungen", image: "/assets/risk/insurance.webp", recommendation: "Bestehende Sach- und Haftpflichtrisiken auf Lücken und Doppelversicherungen prüfen." },
  { key: "children", name: "Kinder absichern", image: "/assets/risk/children.webp", recommendation: "Versorgung der Kinder bei Erwerbsunfähigkeit und Todesfall kontrollieren." },
  { key: "property-creation", name: "Lebensstandard beibehalten", image: "/assets/risk/living-standard.webp", recommendation: "Einkommensausfall und notwendigen Lebensstandard als Jahresbedarf berechnen." },
  { key: "tax-advantage", name: "Steuervorteile nutzen", image: "/assets/risk/tax.webp", recommendation: "Steuerpotenzial von Vorsorge, Vermögen und Wohneigentum strukturiert prüfen." },
]

// index 0–5 → label + color (yellow = low relevance, red = high relevance)
export const RELEVANCE_LABELS = ["SEHR GERING", "GERING", "MITTEL", "HOCH", "HOCH", "SEHR HOCH"]
export const RELEVANCE_COLORS = ["#F4CE3A", "#F2B807", "#F08C00", "#EE6A20", "#E5502B", "#E5392B"]

/** Answers are stored as a flat map inside analyses.latest_snapshot.answers */
export type WizardAnswers = Record<string, string | number | string[] | null>

function has(answers: WizardAnswers, id: string, v: string): boolean {
  const a = answers[id]
  return Array.isArray(a) ? a.includes(v) : a === v
}
const clamp = (n: number) => Math.max(0, Math.min(5, Math.round(n)))

/** Deterministic relevance engine — 8 area scores (0–5) from the profile. */
export function scores(answers: WizardAnswers): Record<AreaKey, number> {
  const age = Number(answers.alter) || 35
  const brutto = Number(answers.brutto) || 0
  const famVerantwortung = has(answers, "abhaengige", "partner") || has(answers, "abhaengige", "kinder") || has(answers, "abhaengige", "andere")
  const kinderJa = answers.kinder === "ja"

  return {
    health: clamp(2 + (age > 50 ? 1 : 0) + (age > 65 ? 1 : 0) + (answers.rauchen === "ja" ? 1 : 0)
      + (answers.sport === "nein" ? 1 : 0) - (answers.sport === "regelmaessig" ? 1 : 0)
      + (has(answers, "kk_prio", "privat") || has(answers, "kk_prio", "deckung") ? 1 : 0)),

    pensiongap: clamp(2 + (age >= 30 ? 1 : 0) + (age >= 48 ? 1 : 0)
      + (answers.erwerb === "selbstaendig" ? 1 : 0)
      + (has(answers, "zukunft", "staat") || has(answers, "ziele", "fruehpension") ? 1 : 0)),

    investment: clamp(1 + (brutto >= 80000 ? 1 : 0) + (brutto >= 150000 ? 1 : 0)
      + (has(answers, "ziele", "vermoegensaufbau") || has(answers, "ziele", "freiheit") ? 1 : 0)
      + (has(answers, "zukunft", "vermoegen") ? 1 : 0) + (age < 45 ? 1 : 0)),

    "real-estate": clamp((has(answers, "ziele", "eigenheim") ? 2 : 0) + (has(answers, "ziele", "rendite") ? 1 : 0)
      + (answers.wohnen === "eigentum" ? 1 : 0) + (answers.wohnen === "miete" && brutto >= 120000 ? 1 : 0) + (brutto >= 200000 ? 1 : 0)),

    "values-protection": clamp(1 + (famVerantwortung ? 1 : 0) + (answers.wohnen === "eigentum" ? 1 : 0)
      + (answers.motorfahrzeug === "ja" ? 1 : 0) + (answers.haustiere === "ja" ? 1 : 0) + (answers.zivilstand === "verheiratet" ? 1 : 0)),

    children: clamp(kinderJa ? (3 + (has(answers, "abhaengige", "kinder") ? 1 : 0) + (brutto < 80000 ? 1 : 0)) : 0),

    "property-creation": clamp(1 + (answers.fixkosten === "unter3" ? 2 : answers.fixkosten === "3bis6" ? 1 : 0)
      + (has(answers, "zukunft", "lebensstandard") || has(answers, "zukunft", "einkommensverluste") ? 1 : 0)
      + (answers.erwerb === "selbstaendig" ? 1 : 0) + (famVerantwortung ? 1 : 0)),

    "tax-advantage": clamp((brutto >= 80000 ? 1 : 0) + (brutto >= 130000 ? 2 : brutto >= 100000 ? 1 : 0)
      + (has(answers, "ziele", "steuer") ? 2 : 0) + (answers.wohnen === "eigentum" ? 1 : 0)),
  }
}

/* =============== Vertragscheck =============== */
export const PRODUCTS = [
  "Vorsorgeversicherung", "VorsorgeBank 3a", "Hypothek", "Private Haftpflicht", "Sparplan", "Krankenkasse",
  "Gebäude", "Rechtsschutz", "Hausrat", "Motorfahrzeug", "Kindersparplan", "Todesfall", "Erwerbsunfähigkeit", "Kredit",
]

export const INTERVALS: Record<string, string> = {
  monthly: "Monatlich", quarterly: "Vierteljährlich", semiannual: "Halbjährlich", annual: "Jährlich", oneoff: "Einmalig",
}

export const COMPANIES = [
  "Agrisano", "Allianz Suisse", "Appenzeller Versicherungen", "Assura", "Atupri", "AXA", "Baloise", "Basler Kantonalbank",
  "Bank Cler", "Banque Cantonale Vaudoise", "Banque Cantonale de Genève", "Cembra Money Bank", "Concordia", "CSS",
  "Die Mobiliar", "EGK", "elipsLife", "Generali Schweiz", "Glarner Kantonalbank", "Groupe Mutuel", "Helsana", "Helvetia",
  "Hypothekarbank Lenzburg", "KPT", "Luzerner Kantonalbank", "Migros Bank", "Neon", "Obwaldner Kantonalbank", "ÖKK", "Pax",
  "PostFinance", "Protekta", "Raiffeisen", "Sanitas", "Schwyzer Kantonalbank", "Simpego", "Smile", "Solothurner Kantonalbank",
  "St. Galler Kantonalbank", "Swiss Life", "Swissquote", "Sympany", "Thurgauer Kantonalbank", "UBS", "Valiant", "Vaudoise",
  "Visana", "Zuger Kantonalbank", "Zürcher Kantonalbank", "Zurich Versicherung",
].sort((a, b) => a.localeCompare(b, "de-CH"))

export type Contract = {
  company?: string
  pol?: string
  start?: string
  abl?: string
  premium?: number
  interval?: string
  notes?: string
}
export type Contracts = Record<string, Contract>
export type ThemeStatus = "open" | "progress" | "done"

/* =============== Helpers =============== */
export function isAnswered(q: Question, answers: WizardAnswers): boolean {
  const v = answers[q.id]
  if (q.type === "multi") return Array.isArray(v) && v.length > 0
  if (q.type === "slider") return true
  if (q.type === "text") return !!(v && String(v).trim())
  return v != null
}

export function countAnswered(answers: WizardAnswers): number {
  return QUESTIONS.reduce((n, q) => (isAnswered(q, answers) ? n + 1 : n), 0)
}

export function progressPercent(answers: WizardAnswers): number {
  return Math.round((countAnswered(answers) / TOTAL_QUESTIONS) * 100)
}

/** 0–100 overall "Handlungsbedarf" = average of the 8 area scores. */
export function needScore(answers: WizardAnswers): number {
  const s = scores(answers)
  const vals = AREAS.map((a) => s[a.key])
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  return Math.round((avg / 5) * 100)
}

export function answerLabel(q: Question, value: WizardAnswers[string]): string {
  if (Array.isArray(value)) return value.map((v) => answerLabel(q, v)).join(", ")
  const option = (q.opts || []).find((o) => o[0] === value)
  if (option) return option[1]
  if (value == null || value === "") return "—"
  if (q.type === "slider" && q.fmt) return q.fmt(Number(value))
  return String(value)
}

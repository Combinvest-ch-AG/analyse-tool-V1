// Data-driven definition of the analysis wizard. Adding/moving questions here
// automatically updates rendering, progress, autosave, and the live gauge.

export type FieldType = "radio" | "select" | "date" | "currency" | "number" | "relevance" | "scale" | "multiselect"

export type Option = { value: string; label: string }

export type Question = {
  key: string
  label: string
  help?: string
  type: FieldType
  options?: Option[]
  min?: number
  max?: number
  step?: number
  suffix?: string
  /** relevance questions feed the live "Handlungsbedarf" gauge */
  weightsGauge?: boolean
}

export type Step = {
  id: string
  title: string
  subtitle: string
  questions: Question[]
}

export const CANTONS: Option[] = [
  "AG","AI","AR","BE","BL","BS","FR","GE","GL","GR","JU","LU","NE","NW","OW",
  "SG","SH","SO","SZ","TG","TI","UR","VD","VS","ZG","ZH",
].map((c) => ({ value: c, label: c }))

export const WIZARD_STEPS: Step[] = [
  {
    id: "profil",
    title: "Profil",
    subtitle: "Grunddaten für eine präzise Berechnung.",
    questions: [
      {
        key: "geschlecht",
        label: "Geschlecht",
        type: "radio",
        options: [
          { value: "M", label: "Männlich" },
          { value: "W", label: "Weiblich" },
        ],
      },
      { key: "geburtsdatum", label: "Geburtsdatum", type: "date" },
      { key: "wohnort_plz", label: "Postleitzahl", type: "number", suffix: "PLZ" },
      { key: "kanton", label: "Kanton", type: "select", options: CANTONS },
      {
        key: "erwerbsstatus",
        label: "Erwerbsstatus",
        type: "radio",
        options: [
          { value: "angestellt", label: "Angestellt" },
          { value: "selbststaendig", label: "Selbstständig" },
        ],
      },
      { key: "einkommen_brutto_jahr", label: "Bruttoeinkommen pro Jahr", type: "currency" },
      { key: "einkommen_netto_monat", label: "Nettoeinkommen pro Monat", type: "currency" },
      {
        key: "wohnsituation",
        label: "Wohnsituation",
        type: "radio",
        options: [
          { value: "miete", label: "Zur Miete" },
          { value: "eigentum", label: "Wohneigentum" },
        ],
      },
    ],
  },
  {
    id: "lebensbereiche",
    title: "Lebensbereiche",
    subtitle: "Wie relevant sind diese acht Bereiche für den Kunden?",
    questions: [
      { key: "rel_pensiongap", label: "Vorsorge & Rentenlücke", type: "relevance", weightsGauge: true },
      { key: "rel_investment", label: "Vermögensaufbau & Anlegen", type: "relevance", weightsGauge: true },
      { key: "rel_property_creation", label: "Lebensstandard sichern", type: "relevance", weightsGauge: true },
      { key: "rel_health", label: "Krankenkasse & Gesundheit", type: "relevance", weightsGauge: true },
      { key: "rel_real_estate", label: "Wohneigentum & Tragbarkeit", type: "relevance", weightsGauge: true },
      { key: "rel_children", label: "Kinder & Ausbildung", type: "relevance", weightsGauge: true },
      { key: "rel_tax_advantage", label: "Steuern optimieren", type: "relevance", weightsGauge: true },
      { key: "rel_values_protection", label: "Absicherung & Verträge", type: "relevance", weightsGauge: true },
    ],
  },
  {
    id: "risikoprofil",
    title: "Risikoprofil",
    subtitle: "Anlagehorizont und Risikobereitschaft.",
    questions: [
      {
        key: "anlagehorizont_jahre",
        label: "Anlagehorizont",
        type: "scale",
        min: 1,
        max: 40,
        step: 1,
        suffix: "Jahre",
      },
      {
        key: "risikoklasse",
        label: "Risikobereitschaft",
        help: "1 = sehr sicherheitsorientiert, 7 = sehr risikofreudig",
        type: "scale",
        min: 1,
        max: 7,
        step: 1,
      },
      {
        key: "ziele",
        label: "Finanzielle Ziele",
        help: "Mehrfachauswahl möglich",
        type: "multiselect",
        options: [
          { value: "wealth_building", label: "Vermögen aufbauen" },
          { value: "high_returns", label: "Hohe Renditen" },
          { value: "retirement", label: "Vorsorge / Rente" },
          { value: "protection_family", label: "Familie absichern" },
          { value: "tax_advantages", label: "Steuervorteile" },
        ],
      },
    ],
  },
]

export const ALL_QUESTIONS: Question[] = WIZARD_STEPS.flatMap((s) => s.questions)
export const TOTAL_QUESTIONS = ALL_QUESTIONS.length
export const GAUGE_KEYS = ALL_QUESTIONS.filter((q) => q.weightsGauge).map((q) => q.key)

export const RELEVANCE_LABELS: Record<number, string> = {
  1: "Sehr gering",
  2: "Gering",
  3: "Mittel",
  4: "Erhöht",
  5: "Hoch",
  6: "Sehr hoch",
}

/** Answers are stored as a flat map inside analyses.latest_snapshot.answers */
export type WizardAnswers = Record<string, string | number | string[] | null>

export function countAnswered(answers: WizardAnswers): number {
  return ALL_QUESTIONS.reduce((n, q) => {
    const v = answers[q.key]
    if (v == null || v === "") return n
    if (Array.isArray(v)) return v.length > 0 ? n + 1 : n
    return n + 1
  }, 0)
}

export function progressPercent(answers: WizardAnswers): number {
  return Math.round((countAnswered(answers) / TOTAL_QUESTIONS) * 100)
}

/** 0–100 "Handlungsbedarf" derived from the 8 relevance sliders (avg of 1–6 → %). */
export function needScore(answers: WizardAnswers): number {
  const vals = GAUGE_KEYS.map((k) => Number(answers[k])).filter((n) => !Number.isNaN(n) && n > 0)
  if (vals.length === 0) return 0
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  return Math.round(((avg - 1) / 5) * 100)
}

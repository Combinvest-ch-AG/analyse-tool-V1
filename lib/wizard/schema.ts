// Data-driven definition of the Combinvest "Finanzstatus Check" wizard.
// Ported 1:1 from the legacy analyse.html so the deterministic relevance
// engine, the profiling flow, the contract check and the risk cockpit all
// stay faithful to the original advisory tool.

export type FieldType = "single" | "multi" | "slider" | "text"

export type Option = [value: string, label: string]

export type DetailField = {
  id: string
  label: string
  type: "text" | "number" | "ages"
  placeholder?: string
  hint?: string
  min?: number
  max?: number
  required?: boolean
  showWhen: string[]
  countFrom?: string
}

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
  directInput?: boolean
  /** Zeigt unter dem (jährlichen) Bruttolohn die Netto-Berechnung mit AHV/ALV/BVG-Abzügen. */
  salaryNet?: boolean
  details?: DetailField[]
  visibleWhen?: { id: string; values: string[] }
}

const chf = (v: number) => "CHF " + Number(v).toLocaleString("de-CH")

/* =============== Fragenkatalog =============== */
export const QUESTIONS: Question[] = [
  { id: "geschlecht", t: "Geschlecht", type: "single", opts: [["M", "Männlich"], ["W", "Weiblich"]] },
  { id: "alter", t: "Wann sind Sie geboren?", sub: "Ihr Alter in Jahren", type: "slider", min: 18, max: 80, def: 35, fmt: (v) => v + " Jahre" },
  {
    id: "sport",
    t: "Wie regelmässig sind Sie sportlich aktiv?",
    sub: "Diese Angaben können später in den Sealth-Bedarfscheck übernommen werden.",
    type: "single",
    opts: [["nein", "Aktuell nicht"], ["gelegentlich", "Gelegentlich"], ["regelmaessig", "Regelmässig"]],
    details: [
      { id: "sport_art", label: "Welche Sportart?", type: "text", placeholder: "z. B. Fitness, Fussball oder Yoga", showWhen: ["gelegentlich", "regelmaessig"] },
      { id: "sport_ort", label: "Wo üben Sie diese aus?", type: "text", placeholder: "z. B. Fitnesscenter Bern oder Verein", showWhen: ["gelegentlich", "regelmaessig"] },
    ],
  },
  {
    id: "rauchen",
    t: "Konsumieren Sie Tabakwaren oder Nikotinprodukte?",
    sub: "Mehrfachauswahl möglich.",
    type: "multi",
    opts: [["keine", "Keine"], ["zigaretten", "Zigaretten"], ["zigarren", "Zigarren"], ["snus", "Snus"], ["ezigarette", "E-Zigarette / Vape"], ["andere", "Andere"]],
    exclusive: "keine",
    details: [
      {
        id: "tabak_menge_tag",
        label: "Wie viele Einheiten konsumieren Sie durchschnittlich pro Tag?",
        type: "number",
        placeholder: "z. B. 5",
        min: 1,
        max: 200,
        required: true,
        showWhen: ["zigaretten", "zigarren", "snus", "ezigarette", "andere"],
      },
      { id: "tabak_details", label: "Ergänzung", type: "text", placeholder: "Produkt oder Konsum genauer beschreiben", showWhen: ["andere"] },
    ],
  },
  {
    id: "zivilstand",
    t: "Wie ist Ihr Zivilstand?",
    type: "single",
    opts: [
      ["ledig", "Ledig"],
      ["verheiratet", "Verheiratet"],
      ["eingetragene_partnerschaft", "Eingetragene Partnerschaft"],
      ["konkubinat", "Konkubinat"],
      ["geschieden", "Geschieden"],
      ["verwitwet", "Verwitwet"],
    ],
  },
  {
    id: "kinder",
    t: "Haben Sie Kinder?",
    type: "single",
    opts: [["nein", "Nein"], ["ja", "Ja"]],
    details: [
      { id: "kinder_anzahl", label: "Anzahl Kinder", type: "number", min: 1, max: 12, required: true, showWhen: ["ja"] },
      {
        id: "kinder_alter",
        label: "Alter der Kinder",
        type: "ages",
        hint: "Bitte für jedes Kind das aktuelle Alter eintragen.",
        min: 0,
        max: 40,
        required: true,
        showWhen: ["ja"],
        countFrom: "kinder_anzahl",
      },
    ],
  },
  {
    id: "kinder_bedarf",
    t: "Was ist Ihnen für Ihre Kinder besonders wichtig?",
    sub: "Mehrfachauswahl möglich. Die Auswahl fliesst direkt in das Live-Relevanzprofil ein.",
    type: "multi",
    opts: [
      ["sparen", "Regelmässig für die Kinder sparen"],
      ["ausbildung", "Ausbildung und Start ins Erwachsenenleben finanzieren"],
      ["invaliditaet", "Kind bei Invalidität finanziell absichern"],
      ["tod", "Versorgung der Kinder im Todesfall sichern"],
      ["kein_bedarf", "Aktuell kein zusätzlicher Bedarf"],
    ],
    exclusive: "kein_bedarf",
    visibleWhen: { id: "kinder", values: ["ja"] },
  },
  {
    id: "abhaengige", t: "Sind ausser Ihren Kindern weitere Personen finanziell von Ihnen abhängig?", sub: "Mehrfachauswahl möglich", type: "multi",
    opts: [["nein", "Nein"], ["partner", "Partner/in"], ["eltern", "Eltern"], ["andere", "Andere"]], exclusive: "nein",
  },
  { id: "motorfahrzeug", t: "Motorfahrzeug vorhanden?", type: "single", opts: [["nein", "Nein"], ["ja", "Ja"]] },
  { id: "haustiere", t: "Haustiere?", type: "single", opts: [["nein", "Nein"], ["ja", "Ja"]] },
  { id: "wohnen", t: "Wie wohnen Sie aktuell?", type: "single", opts: [["miete", "Miete"], ["eigentum", "Eigentum"], ["wg", "Wohngemeinschaft (WG)"], ["familie", "Bei Familie"]] },
  { id: "ausbildung", t: "Höchste abgeschlossene Ausbildung", type: "single", opts: [["obligatorisch", "Obligatorische Schule"], ["lehre", "Lehre / EFZ"], ["hf", "HF / FH"], ["uni", "Universität / ETH"], ["andere", "Andere"]] },
  {
    id: "konfession",
    t: "Steuerrelevante Konfession",
    sub: "Die Zugehörigkeit kann je nach Kanton die Kirchensteuer beeinflussen.",
    type: "single",
    opts: [["keine", "Keine"], ["reformiert", "Christlich / evangelisch-reformiert"], ["katholisch", "Römisch-katholisch"], ["christkatholisch", "Christkatholisch"], ["andere", "Andere"]],
  },
  {
    id: "erwerb",
    t: "Wie ist Ihre aktuelle Erwerbssituation?",
    type: "single",
    opts: [["angestellt", "Angestellt"], ["selbstaendig", "Selbständig"], ["lehrling", "Lehrling"], ["student", "Student/in"], ["keine", "Nicht erwerbstätig"]],
    details: [
      {
        id: "beruf",
        label: "Beruf oder aktuelle Tätigkeit",
        type: "text",
        placeholder: "z. B. Kundenberater, Pflegefachfrau oder Kaufmann EFZ",
        showWhen: ["angestellt", "selbstaendig", "lehrling", "student"],
      },
    ],
  },
  {
    id: "brutto",
    t: "Wie hoch ist Ihr Jahresbruttoeinkommen?",
    sub: "Exakten Betrag eingeben oder mit dem Regler einstellen.",
    type: "slider",
    min: 0,
    max: 500000,
    step: 1000,
    def: 0,
    fmt: chf,
    directInput: true,
    salaryNet: true,
  },
  {
    id: "kk_prio", t: "Was ist Ihnen bei der Gesundheitsvorsorge wichtig?", sub: "Mehrfachauswahl möglich", type: "multi",
    opts: [["deckung", "Optimale Deckung"], ["preis", "Bestes Preis-Leistungs-Verhältnis"], ["wartezeiten", "Kurze Wartezeiten"], ["arztwahl", "Freie Arztwahl"], ["rueckerstattung", "Hohe Rückerstattungen"]],
  },
  {
    id: "invaliditaet_ziel",
    t: "Was ist Ihnen bei Invalidität wichtig?",
    sub: "Mehrfachauswahl möglich",
    type: "multi",
    opts: [["kapital", "Einmalige Kapitalleistung bei Invalidität (Unfall und Krankheit)"], ["ahv_bvg_pruefen", "Leistungen bei Invalidität kennen"], ["lohn", "Lohn absichern bei Invalidität"], ["lebensstandard", "Lebensstandard beibehalten trotz Invalidität"]],
  },
  {
    id: "pension_ziel",
    t: "Was ist Ihnen für die Pensionierung wichtig?",
    sub: "Mehrfachauswahl möglich",
    type: "multi",
    opts: [["fruehpension", "Frühpensionierung ermöglichen"], ["staatsunabhaengig", "Unabhängigkeit von staatlichen Rentenleistungen"], ["lebensstandard", "Lebensstandard beibehalten"], ["vorsorgeluecke", "Vorsorgelücke in Pension schliessen"]],
  },
  {
    id: "tod_ziel",
    t: "Was soll im Todesfall finanziell abgesichert sein?",
    sub: "Mehrfachauswahl möglich",
    type: "multi",
    opts: [["partner", "Partner/in"], ["kinder", "Kinder"], ["wohnen", "Wohneigentum oder Miete"], ["schulden", "Kredite und übrige Verpflichtungen"], ["bestattung", "Bestattungs- und Übergangskosten"], ["kein_bedarf", "Aktuell kein Bedarf"]],
    exclusive: "kein_bedarf",
  },
  {
    id: "liquiditaet",
    t: "Wie hoch ist Ihr aktuell frei verfügbares Vermögen?",
    sub: "Kontoguthaben und kurzfristig verfügbare Anlagen – ohne gebundene Vorsorge und selbstbewohntes Wohneigentum.",
    type: "single",
    opts: [["bis20", "Bis CHF 20’000"], ["20bis50", "CHF 20’001–50’000"], ["50bis100", "CHF 50’001–100’000"], ["100bis250", "CHF 100’001–250’000"], ["ueber250", "Mehr als CHF 250’000"]],
  },
  {
    id: "steuererklaerung",
    t: "Wie möchten Sie Ihre Steuererklärung erledigen?",
    sub: "Mehrfachauswahl möglich – bestimmt mit, welches Sealth-Paket am besten passt.",
    type: "multi",
    opts: [
      ["sparen", "Steuern sparen – Maximum herausholen"],
      ["profi", "Professionell & digital – Experten übernehmen"],
      ["selbst", "Selbst ausfüllen – mit Anleitung"],
      ["eigenstaendig", "Ich erledige sie selber"],
    ],
  },
  {
    id: "ziele", t: "Welche finanziellen Ziele verfolgen Sie?", sub: "Mehrfachauswahl möglich", type: "multi",
    opts: [["vermoegensaufbau", "Vermögensaufbau"], ["eigenheim", "Eigenheim"], ["rendite", "Renditeobjekt"], ["fruehpension", "Frühpensionierung"], ["selbstaendigkeit", "Selbständigkeit planen"], ["freiheit", "Finanzielle Freiheit"]],
  },
]

export const TOTAL_QUESTIONS = QUESTIONS.length
export const PROFILING_SCHEMA_VERSION = 2

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
  { key: "health", name: "Gesundheit", image: "/assets/risk/health.png", recommendation: "Franchise, Versicherungsmodell und Gesundheitskosten gemeinsam prüfen." },
  { key: "pensiongap", name: "Vorsorge", image: "/assets/risk/pension.png", recommendation: "Leistungen bei Invalidität, Pensionierung und Tod der gewünschten Absicherung gegenüberstellen." },
  { key: "investment", name: "Vermögen aufbauen", image: "/assets/risk/investment.png", recommendation: "Liquiditätsreserve, Anlagehorizont und geeignetes Risikoprofil bestimmen." },
  { key: "real-estate", name: "Immobilien", image: "/assets/risk/real-estate.png", recommendation: "Eigenkapital, Tragbarkeit und langfristige Finanzierung beurteilen." },
  { key: "values-protection", name: "Versicherungen", image: "/assets/risk/insurance.png", recommendation: "Bestehende Sach- und Haftpflichtrisiken auf Lücken und Doppelversicherungen prüfen." },
  { key: "children", name: "Kinder absichern", image: "/assets/risk/children.png", recommendation: "Versorgung der Kinder bei Erwerbsunfähigkeit und Todesfall kontrollieren." },
  { key: "property-creation", name: "Lebensstandard beibehalten", image: "/assets/risk/living-standard.png", recommendation: "Einkommensausfall und notwendigen Lebensstandard als Jahresbedarf berechnen." },
  { key: "tax-advantage", name: "Steuervorteile nutzen", image: "/assets/risk/tax.png", recommendation: "Steuerpotenzial von Vorsorge, Vermögen und Wohneigentum strukturiert prüfen." },
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

function hasAny(answers: WizardAnswers, id: string, values: string[]): boolean {
  return values.some((value) => has(answers, id, value))
}

function usesTobacco(answers: WizardAnswers): boolean {
  const value = answers.rauchen
  if (value === "ja") return true // Compatibility with existing analyses.
  return Array.isArray(value) && value.some((item) => item !== "keine")
}

function liquidityScore(answers: WizardAnswers): number {
  const values: Record<string, number> = {
    bis20: 0,
    "20bis50": 1,
    "50bis100": 2,
    "100bis250": 3,
    ueber250: 4,
  }
  return values[String(answers.liquiditaet)] ?? 0
}

/** Deterministic relevance engine — 8 area scores (0–5) from the profile. */
export function scores(answers: WizardAnswers): Record<AreaKey, number> {
  const age = Number(answers.alter) || 35
  const brutto = Number(answers.brutto) || 0
  const kinderJa = answers.kinder === "ja"
  const kinderBedarf = Array.isArray(answers.kinder_bedarf) ? answers.kinder_bedarf : []
  const kinderSparen = kinderBedarf.includes("sparen") || kinderBedarf.includes("ausbildung")
  const kinderSchutz = kinderBedarf.includes("invaliditaet") || kinderBedarf.includes("tod")
  const famVerantwortung = kinderJa || has(answers, "abhaengige", "partner") || has(answers, "abhaengige", "eltern")
    || has(answers, "abhaengige", "kinder") || has(answers, "abhaengige", "andere")

  return {
    health: clamp(2 + (age > 50 ? 1 : 0) + (age > 65 ? 1 : 0) + (usesTobacco(answers) ? 1 : 0)
      + (answers.sport === "nein" ? 1 : 0) - (answers.sport === "regelmaessig" ? 1 : 0)
      + (has(answers, "kk_prio", "deckung") || has(answers, "kk_prio", "rueckerstattung") ? 1 : 0)),

    pensiongap: clamp(2 + (age >= 30 ? 1 : 0) + (age >= 48 ? 1 : 0)
      + (answers.erwerb === "selbstaendig" ? 1 : 0)
      + (hasAny(answers, "invaliditaet_ziel", ["ahv_bvg_pruefen", "lebensstandard", "lohn", "kapital"])
        || hasAny(answers, "pension_ziel", ["fruehpension", "lebensstandard", "vorsorgeluecke", "staatsunabhaengig"])
        || has(answers, "ziele", "fruehpension")
        || has(answers, "zukunft", "staat") ? 1 : 0)),

    investment: clamp(1 + (brutto >= 80000 ? 1 : 0) + (brutto >= 150000 ? 1 : 0)
      + (has(answers, "ziele", "vermoegensaufbau") || has(answers, "ziele", "freiheit") ? 1 : 0)
      + (has(answers, "ziele", "selbstaendigkeit") ? 1 : 0)
      + (kinderSparen ? 1 : 0)
      + (has(answers, "zukunft", "vermoegen") ? 1 : 0)
      + (liquidityScore(answers) >= 2 ? 1 : 0) + (age < 45 ? 1 : 0)),

    "real-estate": clamp((has(answers, "ziele", "eigenheim") ? 2 : 0) + (has(answers, "ziele", "rendite") ? 1 : 0)
      + (answers.wohnen === "eigentum" ? 1 : 0) + (answers.wohnen === "miete" && brutto >= 120000 ? 1 : 0) + (brutto >= 200000 ? 1 : 0)),

    "values-protection": clamp(1 + (famVerantwortung ? 1 : 0) + (answers.wohnen === "eigentum" ? 1 : 0)
      + (answers.motorfahrzeug === "ja" ? 1 : 0) + (answers.haustiere === "ja" ? 1 : 0)
      + (kinderSchutz ? 1 : 0)
      + (["verheiratet", "eingetragene_partnerschaft", "konkubinat"].includes(String(answers.zivilstand)) ? 1 : 0)),

    children: clamp(kinderJa
      ? 2
        + Math.min(2, kinderBedarf.filter((item) => item !== "kein_bedarf").length)
        + (kinderSchutz ? 1 : 0)
        + (has(answers, "tod_ziel", "kinder") ? 1 : 0)
      : 0),

    "property-creation": clamp(1 + (answers.liquiditaet === "bis20" ? 2 : answers.liquiditaet === "20bis50" ? 1 : 0)
      + (has(answers, "invaliditaet_ziel", "lebensstandard") || has(answers, "invaliditaet_ziel", "lohn") || has(answers, "zukunft", "lebensstandard") ? 1 : 0)
      + (answers.erwerb === "selbstaendig" ? 1 : 0) + (famVerantwortung ? 1 : 0)),

    "tax-advantage": clamp((brutto >= 80000 ? 1 : 0) + (brutto >= 130000 ? 2 : brutto >= 100000 ? 1 : 0)
      + (answers.wohnen === "eigentum" ? 1 : 0)
      + (answers.konfession && answers.konfession !== "keine" && answers.konfession !== "andere" ? 1 : 0)),
  }
}

/* =============== Vertragscheck =============== */
export type ProductCategory = "insurance" | "wealth" | "financing" | "subscriptions"

export type ProductDefinition = {
  id: string
  label: string
  category: ProductCategory
  description: string
}

export const PRODUCT_CATEGORIES: Array<{ id: ProductCategory; label: string; shortLabel: string }> = [
  { id: "insurance", label: "Versicherungen", shortLabel: "Versicherung" },
  { id: "wealth", label: "Vorsorge & Vermögen", shortLabel: "Vorsorge" },
  { id: "financing", label: "Bank & Finanzierung", shortLabel: "Finanzierung" },
  { id: "subscriptions", label: "Abonnemente & Fixkosten", shortLabel: "Abos" },
]

export const PRODUCT_DEFINITIONS: ProductDefinition[] = [
  { id: "Krankenkasse", label: "Krankenkasse", category: "insurance", description: "Grund- und Zusatzversicherung" },
  { id: "Private Haftpflicht", label: "Privathaftpflicht", category: "insurance", description: "Schäden gegenüber Dritten" },
  { id: "Hausrat", label: "Hausrat", category: "insurance", description: "Inventar und persönliche Gegenstände" },
  { id: "Gebäude", label: "Gebäudeversicherung", category: "insurance", description: "Versicherung für Wohneigentum" },
  { id: "Motorfahrzeug", label: "Motorfahrzeug", category: "insurance", description: "Auto, Motorrad oder weiteres Fahrzeug" },
  { id: "Rechtsschutz", label: "Rechtsschutz", category: "insurance", description: "Privat- und Verkehrsrechtsschutz" },
  { id: "Reiseversicherung", label: "Reiseversicherung", category: "insurance", description: "Annullation, Assistance und Reisegepäck" },
  { id: "Tierversicherung", label: "Tierversicherung", category: "insurance", description: "Tierarzt- und Behandlungskosten" },
  { id: "Todesfall", label: "Todesfall", category: "insurance", description: "Kapital oder Rente im Todesfall" },
  { id: "Erwerbsunfähigkeit", label: "Erwerbsunfähigkeit", category: "insurance", description: "Rente bei Erwerbsunfähigkeit" },
  { id: "Vorsorgeversicherung", label: "Vorsorgeversicherung", category: "wealth", description: "Gebundene oder freie Vorsorgelösung" },
  { id: "VorsorgeBank 3a", label: "Säule 3a Bank", category: "wealth", description: "Bank- oder Wertschriftenlösung" },
  { id: "Sparplan", label: "Spar- oder Anlageplan", category: "wealth", description: "Regelmässiger Vermögensaufbau" },
  { id: "Kindersparplan", label: "Kindersparplan", category: "wealth", description: "Sparen oder Anlegen für Kinder" },
  { id: "Vermögensverwaltung", label: "Vermögensverwaltung", category: "wealth", description: "Mandat oder digitale Vermögensverwaltung" },
  { id: "Depot / Anlagekonto", label: "Depot / Anlagekonto", category: "wealth", description: "Wertschriftendepot oder Anlagekonto" },
  { id: "Hypothek", label: "Hypothek", category: "financing", description: "Finanzierung von Wohneigentum" },
  { id: "Bankkonto / Paket", label: "Bankkonto / Paket", category: "financing", description: "Konten, Karten und Bankgebühren" },
  { id: "Kredit", label: "Kredit", category: "financing", description: "Privat- oder Konsumkredit" },
  { id: "Leasing", label: "Leasing", category: "financing", description: "Fahrzeug- oder Objektleasing" },
  { id: "Kreditkarte", label: "Kreditkarte", category: "financing", description: "Karte mit Jahres- oder Monatsgebühr" },
  { id: "Miete", label: "Miete / Wohnen", category: "subscriptions", description: "Wohnungs- oder Hausmiete inkl. Nebenkosten" },
  { id: "Mobilfunkabo", label: "Handyabo", category: "subscriptions", description: "Mobilfunk und Gerät" },
  { id: "Internet & TV", label: "Internet & TV", category: "subscriptions", description: "Internet-, Festnetz- und TV-Paket" },
  { id: "Streaming", label: "Film & Serien", category: "subscriptions", description: "Netflix, Disney+, Max und weitere" },
  { id: "Musikabo", label: "Musik", category: "subscriptions", description: "Spotify, Apple Music und weitere" },
  { id: "Fitnessabo", label: "Fitness & Sport", category: "subscriptions", description: "Fitnesscenter, Verein oder Sportpass" },
  { id: "Software & Cloud", label: "Software & Cloud", category: "subscriptions", description: "Cloudspeicher und digitale Dienste" },
  { id: "Zeitung & Medien", label: "Zeitung & Medien", category: "subscriptions", description: "Zeitungen, Magazine und digitale Medien" },
  { id: "Mitgliedschaft", label: "Mitgliedschaft", category: "subscriptions", description: "Verein, Verband oder weitere Mitgliedschaft" },
  { id: "Sonstiges Abo", label: "Weiteres Abo", category: "subscriptions", description: "Weitere regelmässige Fixkosten" },
]

export const PRODUCTS = PRODUCT_DEFINITIONS.map((product) => product.id)

export const INTERVALS: Record<string, string> = {
  monthly: "Monatlich", quarterly: "Vierteljährlich", semiannual: "Halbjährlich", annual: "Jährlich", oneoff: "Einmalig",
}

const HEALTH_INSURERS = [
  "Agrisano", "Aquilana", "Assura", "Atupri", "Avenir Assurance", "Birchmeier", "Concordia", "CSS", "EGK", "Easy Sana",
  "Galenos", "Groupe Mutuel", "Helsana", "Innova", "KPT", "Mutuel Assurance", "ÖKK", "Philos", "Rhenusana", "Sana24",
  "Sanagate", "Sanavals", "Sanitas", "sodalis", "Steffisburg", "SWICA", "Sympany", "Visana", "vivacare", "Vivao Sympany",
]

const INSURERS = [
  "Allianz Suisse", "Appenzeller Versicherungen", "AXA", "Baloise", "CAP Rechtsschutz", "Coop Rechtsschutz", "Dextra",
  "Die Mobiliar", "elipsLife", "Emmental Versicherung", "Fortuna Rechtsschutz", "Generali Schweiz", "GVB", "Helvetia",
  "Orion Rechtsschutz", "Pax", "Protekta", "Simpego", "Smile", "Swiss Life", "TCS", "Vaudoise", "Zurich Versicherung",
]

const BANKS = [
  "Aargauische Kantonalbank", "Alternative Bank Schweiz", "Appenzeller Kantonalbank", "Bank Avera", "Bank Cler", "Bank WIR",
  "Banca dello Stato del Cantone Ticino", "Banque Cantonale du Jura", "Banque Cantonale de Genève", "Banque Cantonale Neuchâteloise",
  "Banque Cantonale Vaudoise", "Basellandschaftliche Kantonalbank", "Basler Kantonalbank", "Berner Kantonalbank (BEKB)",
  "Cembra Money Bank", "Clientis", "Cornèr Bank", "Freiburger Kantonalbank", "Glarner Kantonalbank", "Graubündner Kantonalbank",
  "Hypothekarbank Lenzburg", "Luzerner Kantonalbank", "Migros Bank", "Neon", "Nidwaldner Kantonalbank", "Obwaldner Kantonalbank",
  "PostFinance", "Raiffeisen", "Regiobank", "Schaffhauser Kantonalbank", "Schwyzer Kantonalbank", "Solothurner Kantonalbank",
  "St. Galler Kantonalbank", "Thurgauer Kantonalbank", "UBS", "Urner Kantonalbank", "Valiant", "Walliser Kantonalbank",
  "Zuger Kantonalbank", "Zürcher Kantonalbank",
]

const INVEST_PENSION = [
  "Alpian", "Clevercircles", "Descartes Finance", "Everon", "findependent", "finpension", "frankly", "Inyova", "kaspar&",
  "Saxo Bank Schweiz", "Selma Finance", "Swissquote", "True Wealth", "VIAC", "Yuh",
]

const FINANCIAL_COMPANIES = [...HEALTH_INSURERS, ...INSURERS, ...BANKS, ...INVEST_PENSION]

const SUBSCRIPTION_COMPANIES = [
  "Netflix", "Disney+", "Spotify", "Max (HBO)", "Apple TV+", "Apple Music", "Amazon Prime Video", "YouTube Premium",
  "Sky Show", "Paramount+", "DAZN", "Audible", "Deezer", "Google One", "iCloud+", "Microsoft 365", "Dropbox",
  "Adobe", "Swisscom", "Sunrise", "Salt", "Wingo", "Yallo", "M-Budget Mobile", "Coop Mobile", "Quickline",
  "Galaxus Mobile", "Digital Republic", "blue TV", "ACTIV FITNESS", "PureGym", "NonStop Gym", "basefit.ch",
]

export const COMPANIES = [...new Set([...FINANCIAL_COMPANIES, ...SUBSCRIPTION_COMPANIES])]
  .sort((a, b) => a.localeCompare(b, "de-CH"))

export const PROVIDERS_BY_PRODUCT: Record<string, string[]> = {
  Krankenkasse: ["CSS", "Helsana", "SWICA", "Sanitas", "Groupe Mutuel", "Concordia", "Visana", "Innova", "KPT", "ÖKK", "Sympany", "Atupri", "Assura"],
  Rechtsschutz: ["Protekta", "CAP Rechtsschutz", "Orion Rechtsschutz", "Coop Rechtsschutz", "Fortuna Rechtsschutz", "Dextra", "AXA", "Die Mobiliar", "TCS"],
  Hypothek: ["UBS", "Raiffeisen", "Zürcher Kantonalbank", "Berner Kantonalbank (BEKB)", "Migros Bank", "PostFinance", "Valiant", "Helvetia", "Swiss Life"],
  Vermögensverwaltung: ["Everon", "True Wealth", "Selma Finance", "Swissquote", "UBS", "Zürcher Kantonalbank", "Raiffeisen"],
  "Depot / Anlagekonto": ["Everon", "Swissquote", "Saxo Bank Schweiz", "Yuh", "Neon", "UBS", "Zürcher Kantonalbank", "Raiffeisen"],
  "VorsorgeBank 3a": ["VIAC", "frankly", "finpension", "UBS", "Zürcher Kantonalbank", "Raiffeisen", "Migros Bank"],
  Streaming: ["Netflix", "Disney+", "Max (HBO)", "Amazon Prime Video", "Apple TV+", "Sky Show", "Paramount+", "DAZN", "YouTube Premium"],
  Musikabo: ["Spotify", "Apple Music", "YouTube Premium", "Deezer", "Audible"],
  Mobilfunkabo: ["Swisscom", "Sunrise", "Salt", "Wingo", "Yallo", "M-Budget Mobile", "Coop Mobile", "Galaxus Mobile", "Digital Republic"],
  "Internet & TV": ["Swisscom", "Sunrise", "Salt", "Quickline", "Wingo", "Yallo", "blue TV"],
  "Software & Cloud": ["Microsoft 365", "Google One", "iCloud+", "Dropbox", "Adobe"],
  Fitnessabo: ["ACTIV FITNESS", "PureGym", "NonStop Gym", "basefit.ch"],
}

export type Contract = {
  product?: string
  company?: string
  pol?: string
  start?: string
  abl?: string
  premium?: number
  interval?: string
  notes?: string
}

export const CONTRACT_INTERVAL_FACTOR: Record<string, number> = {
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
  oneoff: 0,
}

export function contractAnnualAmount(contract: Contract): number {
  const premium = Math.max(0, Number(contract.premium) || 0)
  return premium * (CONTRACT_INTERVAL_FACTOR[contract.interval || "monthly"] ?? 12)
}

export function contractMonthlyAmount(contract: Contract): number {
  return Math.round((contractAnnualAmount(contract) / 12) * 100) / 100
}

export type Contracts = Record<string, Contract>
export type ThemeStatus = "open" | "progress" | "done"

/* =============== Helpers =============== */
export function isQuestionVisible(q: Question, answers: WizardAnswers): boolean {
  if (!q.visibleWhen) return true
  const value = answers[q.visibleWhen.id]
  return q.visibleWhen.values.some((expected) =>
    Array.isArray(value) ? value.includes(expected) : value === expected,
  )
}

export function visibleQuestionCount(answers: WizardAnswers): number {
  return QUESTIONS.filter((q) => isQuestionVisible(q, answers)).length
}

export function isAnswered(q: Question, answers: WizardAnswers): boolean {
  if (!isQuestionVisible(q, answers)) return true
  const v = answers[q.id]
  const mainAnswered =
    q.type === "multi"
      ? Array.isArray(v) && v.length > 0
      : q.type === "slider"
        ? q.directInput
          ? typeof v === "number"
          : true
        : q.type === "text"
          ? !!(v && String(v).trim())
          : v != null
  if (!mainAnswered) return false

  for (const detail of q.details ?? []) {
    const selected = Array.isArray(v) ? v : [String(v)]
    if (!detail.required || !detail.showWhen.some((item) => selected.includes(item))) continue
    const detailValue = answers[detail.id]
    if (detail.type === "ages") {
      const count = Number(answers[detail.countFrom ?? ""]) || 0
      if (
        !Array.isArray(detailValue)
        || count < 1
        || detailValue.length < count
        || detailValue.slice(0, count).some((item) => String(item).trim() === "")
      ) return false
    } else if (detail.type === "number") {
      if (detailValue == null || detailValue === "" || Number(detailValue) < (detail.min ?? 0)) return false
    } else if (!detailValue || !String(detailValue).trim()) {
      return false
    }
  }
  return true
}

export function countAnswered(answers: WizardAnswers): number {
  return QUESTIONS.reduce((n, q) => (isQuestionVisible(q, answers) && isAnswered(q, answers) ? n + 1 : n), 0)
}

export function progressPercent(answers: WizardAnswers): number {
  const visible = visibleQuestionCount(answers)
  return visible > 0 ? Math.round((countAnswered(answers) / visible) * 100) : 0
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

/** Human-readable answer including any conditional detail fields. */
export function answerSummary(q: Question, answers: WizardAnswers): string {
  const parts = [answerLabel(q, answers[q.id] ?? null)]
  const main = answers[q.id]
  const selected = Array.isArray(main) ? main : [String(main)]

  for (const detail of q.details ?? []) {
    if (!detail.showWhen.some((item) => selected.includes(item))) continue
    const value = answers[detail.id]
    if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) continue
    const formatted = Array.isArray(value) ? value.join(", ") : String(value)
    const suffix = detail.type === "ages" ? " Jahre" : detail.id === "tabak_menge_tag" ? " pro Tag" : ""
    parts.push(`${detail.label.replace(/[?:]+$/, "")}: ${formatted}${suffix}`)
  }
  return parts.join(" · ")
}

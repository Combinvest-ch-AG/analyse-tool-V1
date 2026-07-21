import type { AreaKey } from "@/lib/wizard/schema"

export type ThemeToolIcon =
  | "coins" | "chart" | "scale" | "clock" | "target" | "doc"
  | "calc" | "gauge" | "home" | "shield" | "heart"

export type ThemeTool = {
  id: string
  title: string
  icon: ThemeToolIcon
  desc: string
  href: string
}

/**
 * Routes that are actually built. Tools pointing at a built route render as
 * "Live"; everything else shows "In Kürze". Extend this set as pages ship.
 */
export const BUILT_ROUTES = new Set<string>([
  "/rechner/vorsorge",
  "/rechner/franchise",
  "/rechner/tragbarkeit",
  "/rechner/ahv",
  "/rechner/budget",
  "/rechner/vermoegen",
  "/rechner/anlegerprofil",
  "/rechner/pk-ausweis",
  "/rechner/freizuegigkeit",
  "/versicherung/uebersicht",
  "/versicherung/zusatz",
  "/versicherung/sach-motor",
  "/sealth",
])

export const THEME_TOOLS: Record<string, ThemeTool> = {
  budget: { id: "budget", title: "Budget", icon: "coins", desc: "Einnahmen und Ausgaben erfassen — Geldfluss und Sparquote auf einen Blick.", href: "/rechner/budget" },
  sparrechner: { id: "sparrechner", title: "Sparrechner", icon: "chart", desc: "Sehen Sie, wie sich Ihr Geld über die Zeit in mehreren Szenarien entwickelt.", href: "/rechner/vermoegen?tool=sparen" },
  zins: { id: "zins", title: "Zinsvergleich", icon: "scale", desc: "Vergleichen Sie das Endergebnis mit verschiedenen Zinssätzen.", href: "/rechner/vermoegen?tool=zins" },
  startwarten: { id: "startwarten", title: "Starten oder Warten", icon: "clock", desc: "Welchen Unterschied macht es, sofort statt später mit dem Sparen zu beginnen?", href: "/rechner/vermoegen?tool=start" },
  anleger: { id: "anleger", title: "Anlegerprofil", icon: "gauge", desc: "Welche Anlageform passt zu Kenntnissen, Risikoneigung und Situation?", href: "/rechner/anlegerprofil" },
  rente: { id: "rente", title: "AHV-Rentenrechner", icon: "doc", desc: "AHV-Rente mit durchschnittlichem Jahreseinkommen und Rentenskala 44 schätzen.", href: "/rechner/ahv" },
  vorsorge: { id: "vorsorge", title: "Vorsorgelückenanalyse", icon: "target", desc: "Invalidität, Pensionierung und Todesfall über AHV/IV, BVG, UVG und 3a vergleichen.", href: "/rechner/vorsorge" },
  steuer3a: { id: "steuer3a", title: "Steuereffekte 3a", icon: "calc", desc: "Welche Steuerwirkung hat die regelmässige Einzahlung in die Säule 3a?", href: "/rechner/vermoegen?tool=3a" },
  luecke: { id: "luecke", title: "Vorsorgelücke", icon: "gauge", desc: "Leistungen aus AHV/IV, BVG, UVG und 3a dem Zielbedarf gegenüberstellen.", href: "/rechner/vorsorge" },
  franchise: { id: "franchise", title: "Franchise-Vergleich", icon: "heart", desc: "Grundversicherungsprämie vergleichen und Ihr Sparpotenzial sehen.", href: "/rechner/franchise" },
  zusatz: { id: "zusatz", title: "Zusatzversicherungs-Check", icon: "shield", desc: "Spital- und ambulante Ergänzungen wählen und jede Deckung verständlich erklären.", href: "/versicherung/zusatz" },
  versicherungsberatung: { id: "versicherungsberatung", title: "Versicherungsübersicht", icon: "shield", desc: "Grund-, Zusatzversicherung und Sachdeckungen gemeinsam überblicken.", href: "/versicherung/uebersicht" },
  sachmotor: { id: "sachmotor", title: "Hausrat, Haftpflicht & Auto", icon: "shield", desc: "Gewünschte Deckungen wählen, erklären und in der Analyse speichern.", href: "/versicherung/sach-motor" },
  tragbar: { id: "tragbar", title: "Wohnrechner — Tragbarkeit", icon: "home", desc: "Können Sie sich die Finanzierung Ihrer Wunschimmobilie leisten?", href: "/rechner/tragbarkeit" },
  steuer: { id: "steuer", title: "Steuerwirkung", icon: "calc", desc: "Schätzen Sie die Wirkung eines frei wählbaren Grenzsteuersatzes.", href: "/rechner/vermoegen?tool=steuer" },
  inflation: { id: "inflation", title: "Inflationsrechner", icon: "chart", desc: "Sehen Sie, wie Inflation die künftige Kaufkraft eines Betrags verändert.", href: "/rechner/vermoegen?tool=inflation" },
  kosten: { id: "kosten", title: "Anlagekosten (TER)", icon: "calc", desc: "Vermögensentwicklung vor und nach laufenden Produktkosten vergleichen.", href: "/rechner/vermoegen?tool=kosten" },
  sparziel: { id: "sparziel", title: "Sparzielrechner", icon: "target", desc: "Monatliche Sparrate für Ihr persönliches Zielvermögen berechnen.", href: "/rechner/vermoegen?tool=ziel" },
  freizuegigkeit: { id: "freizuegigkeit", title: "Freizügigkeitskonto", icon: "doc", desc: "Anfrage für Konto oder Depot strukturiert aus der Vermögensberatung vorbereiten.", href: "/rechner/freizuegigkeit" },
}

export type ThemeConfig = {
  name: string
  headline: string
  points: string[]
  tools: string[]
}

export const THEMES: Record<AreaKey, ThemeConfig> = {
  investment: {
    name: "Vermögen aufbauen",
    headline: "Aus Sparen wird Vermögen",
    points: ["Tiefe Zinsen auf dem Konto", "Der Zinseszins-Effekt über die Zeit", "Regelmässig statt einmalig anlegen"],
    tools: ["budget", "sparrechner", "zins", "startwarten", "anleger", "freizuegigkeit", "inflation", "kosten", "sparziel"],
  },
  pensiongap: {
    name: "Pension vorsorgen",
    headline: "Die eigene Altersvorsorge verstehen",
    points: ["Alternde Demografie", "Sinkende Geburtenraten", "Höhere Lebenserwartung"],
    tools: ["budget", "rente", "vorsorge", "startwarten", "sparrechner", "steuer3a"],
  },
  "property-creation": {
    name: "Lebensstandard beibehalten",
    headline: "Das Einkommen absichern",
    points: ["Krankheit ist häufiger als Unfall", "Einkommensausfall als Jahresbedarf", "Lücken früh erkennen"],
    tools: ["budget", "luecke", "vorsorge", "startwarten"],
  },
  health: {
    name: "Gesundheit",
    headline: "Prämien senken ohne Leistungsverlust",
    points: ["Franchise gezielt wählen", "Modelle vergleichen", "Zusatzdeckungen prüfen"],
    tools: ["franchise", "zusatz", "budget", "luecke"],
  },
  "real-estate": {
    name: "Immobilien",
    headline: "Mieten oder kaufen?",
    points: ["Eigenkapital und Tragbarkeit", "Langfristige Finanzierung", "Nebenkosten realistisch rechnen"],
    tools: ["tragbar", "budget", "startwarten"],
  },
  children: {
    name: "Kinder absichern",
    headline: "Früh starten zahlt sich aus",
    points: ["Versorgung bei Erwerbsunfähigkeit", "Absicherung im Todesfall", "Sparen für die Ausbildung"],
    tools: ["budget", "sparrechner", "vorsorge"],
  },
  "values-protection": {
    name: "Versicherungen",
    headline: "Nur absichern, was wirklich zählt",
    points: ["Lücken und Doppelversicherungen", "Sach- und Haftpflichtrisiken", "Deckungen verständlich erklärt"],
    tools: ["versicherungsberatung", "franchise", "zusatz", "sachmotor", "budget", "steuer"],
  },
  "tax-advantage": {
    name: "Steuervorteile nutzen",
    headline: "Weniger Steuern, mehr Vorsorge",
    points: ["Säule 3a als Steuerhebel", "Vermögen steueroptimiert aufbauen", "Grenzsteuersatz verstehen"],
    tools: ["steuer3a", "steuer", "sparrechner"],
  },
}

// Zentrale, typisierte Farbpaletten für alle Datenvisualisierungen der Rechner.
// Single source of truth — ersetzt verstreute Hex-Literale in SVGs, Charts und Legenden.
// Rein semantische UI-/Theme-Farben liegen dagegen als CSS-Tokens in app/globals.css.

/** Serienfarben für Balken, Linien und die dazugehörigen Legenden-Swatches. */
export const seriesColor = {
  blue: "#3978f6", // Brand-Primär
  green: "#24a66f",
  amber: "#f2a12c",
  orange: "#f59e42",
  purple: "#8a62d3",
  red: "#ef4444",
} as const

/** Neutrale Töne für Achsen, Gitter, Werte und Marker in SVG-Charts. */
export const chartInk = {
  strong: "#111d36", // dunkle Werte / Marker
  axis: "#65748b", // Achsenbeschriftung
  grid: "#dce4ef", // Gitterlinien
  label: "#52617a", // Legenden-/Scrubber-Text
  labelSoft: "#587096", // sekundäre Beschriftung
  surface: "#ffffff", // Punkt-Füllung auf Linien
} as const

/** Kategorie-Palette für Budget-Aufteilungen. */
export const budgetPalette = ["#ee6a20", "#256abf", "#159b8a", "#c2554e", "#3f7cc0", "#b07a1e"] as const

/** Risiko-Verlauf (defensiv → offensiv) im Anlegerprofil. */
export const investorGradient = [
  "#6b83a6",
  "#5b8fb9",
  "#4d9eb6",
  "#419e91",
  "#53a66b",
  "#d3a84d",
  "#e47a55",
] as const

/** Budget-Sankey-Diagramm. */
export const sankeyColor = {
  income: "#188a57",
  budget: "#3a57f5",
  tooltip: "#101b34",
} as const

export type SeriesColorKey = keyof typeof seriesColor

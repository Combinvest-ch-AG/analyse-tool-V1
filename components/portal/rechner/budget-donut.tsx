"use client"

import { useMemo, useState } from "react"
import { ChevronLeft } from "lucide-react"
import { formatCHF } from "@/lib/format"
import { budgetPalette, sankeyColor } from "@/lib/data/chart-colors"

type Item = { name: string; amount: number }
type Category = { name: string; color: string; subs: Item[] }

const clamp = (v: number) => (!isFinite(v) || v < 0 ? 0 : Math.min(v, 1e8))
const catTotal = (c: Category) => c.subs.reduce((t, s) => t + clamp(s.amount), 0)

/** Segment für den Ring: Label, Wert, Farbe und – bei Kategorien – der Drill-down-Index. */
type Segment = { key: string; label: string; value: number; color: string; catIndex?: number }

/** Mischt eine Hex-Farbe Richtung Weiss (t = 0 … 1) für die Unterposten-Töne einer Kategorie. */
function tint(hex: string, t: number) {
  const n = Number.parseInt(hex.replace("#", ""), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const mix = (c: number) => Math.round(c + (255 - c) * t)
  return `#${((1 << 24) + (mix(r) << 16) + (mix(g) << 8) + mix(b)).toString(16).slice(1)}`
}

const CX = 120
const CY = 120
const R_OUTER = 116
const R_INNER = 74
const PAD = 0.014 // Lücke zwischen Segmenten (Radiant)

function polar(r: number, angle: number): [number, number] {
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)]
}

function arcPath(start: number, end: number) {
  const large = end - start > Math.PI ? 1 : 0
  const [sxO, syO] = polar(R_OUTER, start)
  const [exO, eyO] = polar(R_OUTER, end)
  const [sxI, syI] = polar(R_INNER, end)
  const [exI, eyI] = polar(R_INNER, start)
  return `M${sxO},${syO} A${R_OUTER},${R_OUTER} 0 ${large} 1 ${exO},${eyO} L${sxI},${syI} A${R_INNER},${R_INNER} 0 ${large} 0 ${exI},${eyI} Z`
}

/**
 * Handgebauter Donut als zweite Budget-Ansicht neben dem Sankey.
 * Teilt sich Datenmodell, Farbtokens und catTotal-Logik mit dem Rechner, damit
 * die Zahlen nie auseinanderlaufen. Toggle Ausgaben/Einnahmen, Kategorien per
 * Klick in ihre Unterposten aufschlüsselbar.
 */
export function BudgetDonut({ income, cats }: { income: Item[]; cats: Category[] }) {
  const [mode, setMode] = useState<"exp" | "inc">("exp")
  const [drill, setDrill] = useState<number | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  // Beim Wechsel auf Einnahmen ist kein Drill-down sinnvoll.
  const activeDrill = mode === "exp" ? drill : null

  const segments = useMemo<Segment[]>(() => {
    if (mode === "inc") {
      return income
        .map((x, i) => ({
          key: "inc" + i,
          label: x.name || "Einnahme",
          value: clamp(x.amount),
          color: budgetPalette[i % budgetPalette.length],
        }))
        .filter((s) => s.value > 0)
    }
    if (activeDrill != null && cats[activeDrill]) {
      const c = cats[activeDrill]
      const subs = c.subs.filter((s) => clamp(s.amount) > 0)
      return subs.map((s, i) => ({
        key: "sub" + i,
        label: s.name || "Posten",
        value: clamp(s.amount),
        color: tint(c.color, subs.length > 1 ? (i / (subs.length - 1)) * 0.55 : 0),
      }))
    }
    return cats
      .map((c, ci) => ({
        key: "cat" + ci,
        label: c.name || "Kategorie",
        value: catTotal(c),
        color: c.color,
        catIndex: ci,
      }))
      .filter((s) => s.value > 0)
  }, [mode, activeDrill, income, cats])

  const total = useMemo(() => segments.reduce((t, s) => t + s.value, 0), [segments])

  // Kumulative Winkel ab 12-Uhr-Position.
  const arcs = useMemo(() => {
    if (total <= 0) return []
    let a = -Math.PI / 2
    return segments.map((s) => {
      const sweep = (s.value / total) * (Math.PI * 2)
      const start = a + PAD / 2
      const end = a + sweep - PAD / 2
      a += sweep
      return { seg: s, start, end: Math.max(start, end) }
    })
  }, [segments, total])

  const hovered = hover ? segments.find((s) => s.key === hover) : undefined
  const drillCat = activeDrill != null ? cats[activeDrill] : undefined

  const centerValue = hovered ? hovered.value : total
  const centerLabel = hovered
    ? hovered.label
    : drillCat
      ? drillCat.name
      : mode === "exp"
        ? "Gesamtausgaben"
        : "Gesamteinnahmen"

  return (
    <div>
      {/* Kopf: Umschalter Ausgaben/Einnahmen + Drill-down-Zurück */}
      <div className="mb-4 flex items-center justify-between gap-3">
        {drillCat ? (
          <button
            type="button"
            onClick={() => setDrill(null)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-muted-foreground transition-colors hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
            Alle Kategorien
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">
            {mode === "exp" ? "Tippen Sie eine Kategorie an, um sie aufzuschlüsseln." : "Ihre Einkommensquellen."}
          </span>
        )}
        <div className="flex flex-none rounded-lg border border-border bg-secondary/40 p-0.5">
          {(["exp", "inc"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setDrill(null)
                setHover(null)
              }}
              aria-pressed={mode === m}
              className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "exp" ? "Ausgaben" : "Einnahmen"}
            </button>
          ))}
        </div>
      </div>

      {total <= 0 ? (
        <div className="flex min-h-[240px] items-center justify-center px-3 py-12 text-center text-sm text-muted-foreground">
          {mode === "exp"
            ? "Geben Sie Ausgaben ein, um die Aufteilung zu sehen."
            : "Geben Sie Einnahmen ein, um die Aufteilung zu sehen."}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-center">
          {/* Liste */}
          <ul className="w-full min-w-0 flex-1 space-y-1">
            {segments.map((s) => {
              const pct = Math.round((s.value / total) * 100)
              const dim = hover != null && hover !== s.key
              const clickable = s.catIndex != null
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => clickable && setDrill(s.catIndex!)}
                    onMouseEnter={() => setHover(s.key)}
                    onMouseLeave={() => setHover(null)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      clickable ? "cursor-pointer hover:bg-secondary/60" : "cursor-default"
                    } ${dim ? "opacity-40" : ""}`}
                  >
                    <span className="h-3 w-3 flex-none rounded-sm" style={{ background: s.color }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{s.label}</span>
                    <span className="flex-none text-xs tabular-nums text-muted-foreground">{pct}%</span>
                    <span className="flex-none tabular-nums text-sm font-bold text-foreground">
                      {formatCHF(s.value)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {/* Donut */}
          <div className="relative flex-none">
            <svg width={240} height={240} viewBox="0 0 240 240" className="block overflow-visible">
              {arcs.map(({ seg, start, end }) => {
                const dim = hover != null && hover !== seg.key
                const clickable = seg.catIndex != null
                return (
                  <path
                    key={seg.key}
                    d={arcPath(start, end)}
                    fill={seg.color}
                    stroke="var(--card)"
                    strokeWidth={2}
                    opacity={dim ? 0.28 : 1}
                    className={`transition-opacity duration-150 ${clickable ? "cursor-pointer" : ""}`}
                    onMouseEnter={() => setHover(seg.key)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => clickable && setDrill(seg.catIndex!)}
                  />
                )
              })}
            </svg>
            {/* Mitte: Summe bzw. gehovertes Segment */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
              <span className="max-w-full truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {centerLabel}
              </span>
              <span className="mt-0.5 text-xl font-black tabular-nums text-foreground">{formatCHF(centerValue)}</span>
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: sankeyColor.budget }} />
        Anteile in Prozent {drillCat ? `von ${drillCat.name}` : mode === "exp" ? "der Gesamtausgaben" : "der Gesamteinnahmen"}.
      </p>
    </div>
  )
}

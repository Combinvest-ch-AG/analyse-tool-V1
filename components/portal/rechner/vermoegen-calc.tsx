"use client"

import { useId, useMemo, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { formatCHF } from "@/lib/format"
import { CalcActionBar, type CalcContext } from "@/components/portal/rechner/calc-action-bar"

export type WealthMode =
  | "sparen"
  | "zins"
  | "start"
  | "inflation"
  | "kosten"
  | "ziel"
  | "3a"
  | "steuer"

const MODES: Record<WealthMode, { t: string; d: string }> = {
  sparen: { t: "Spar- und Zinseszinsrechner", d: "Sehen Sie, wie Startkapital, monatliche Sparrate und Rendite Ihr Vermögen entwickeln." },
  zins: { t: "Zinsvergleich", d: "Vergleichen Sie zwei Renditeannahmen über denselben Anlagehorizont." },
  start: { t: "Starten oder warten?", d: "Sehen Sie den Preis des Aufschiebens bei gleicher monatlicher Sparrate." },
  inflation: { t: "Inflationsrechner", d: "Wie viel Kaufkraft bleibt von einem heutigen Betrag in Zukunft?" },
  kosten: { t: "TER-Kostenrechner", d: "Vergleichen Sie Vermögensentwicklung vor und nach laufenden Produktkosten." },
  ziel: { t: "Sparzielrechner", d: "Welche monatliche Sparrate führt zu Ihrem Zielvermögen?" },
  "3a": { t: "Steuereffekt Säule 3a", d: "Schätzen Sie Steuerersparnis und langfristigen Vermögenseffekt Ihrer Einzahlung." },
  steuer: { t: "Einfacher Steuerabzug", d: "Orientierung: Wirkung eines frei wählbaren Grenzsteuersatzes auf Ihr Einkommen." },
}

const ORDER: WealthMode[] = ["sparen", "zins", "start", "inflation", "kosten", "ziel", "3a", "steuer"]

type Data = {
  capital: number
  monthly: number
  years: number
  rate: number
  rate2: number
  delay: number
  inflation: number
  ter: number
  target: number
  income: number
  contribution: number
  tax: number
}

const DEFAULTS: Data = {
  capital: 20000,
  monthly: 500,
  years: 25,
  rate: 5,
  rate2: 3,
  delay: 5,
  inflation: 2,
  ter: 0.8,
  target: 500000,
  income: 100000,
  contribution: 7258,
  tax: 25,
}

function fv(cap: number, mon: number, yrs: number, r: number) {
  const m = r / 1200
  const n = yrs * 12
  return m ? cap * Math.pow(1 + m, n) + (mon * (Math.pow(1 + m, n) - 1)) / m : cap + mon * n
}

type FieldDef =
  | { kind: "money"; key: keyof Data; label: string }
  | { kind: "range"; key: keyof Data; label: string; min: number; max: number; step: number; suffix?: string }

const FIELDS: Record<WealthMode, FieldDef[]> = {
  sparen: [
    { kind: "money", key: "capital", label: "Startkapital" },
    { kind: "money", key: "monthly", label: "Monatliche Sparrate" },
    { kind: "range", key: "years", label: "Anlagehorizont", min: 1, max: 40, step: 1, suffix: " Jahre" },
    { kind: "range", key: "rate", label: "Erwartete Rendite p.a.", min: 0, max: 10, step: 0.1, suffix: " %" },
  ],
  zins: [
    { kind: "money", key: "capital", label: "Startkapital" },
    { kind: "money", key: "monthly", label: "Monatliche Sparrate" },
    { kind: "range", key: "years", label: "Anlagehorizont", min: 1, max: 40, step: 1, suffix: " Jahre" },
    { kind: "range", key: "rate", label: "Rendite 1 p.a.", min: 0, max: 10, step: 0.1, suffix: " %" },
    { kind: "range", key: "rate2", label: "Rendite 2 p.a.", min: 0, max: 10, step: 0.1, suffix: " %" },
  ],
  start: [
    { kind: "money", key: "capital", label: "Startkapital" },
    { kind: "money", key: "monthly", label: "Monatliche Sparrate" },
    { kind: "range", key: "years", label: "Anlagehorizont", min: 1, max: 40, step: 1, suffix: " Jahre" },
    { kind: "range", key: "rate", label: "Erwartete Rendite p.a.", min: 0, max: 10, step: 0.1, suffix: " %" },
    { kind: "range", key: "delay", label: "Verzögerter Start", min: 0, max: 20, step: 1, suffix: " Jahre" },
  ],
  inflation: [
    { kind: "money", key: "capital", label: "Heutiger Betrag" },
    { kind: "range", key: "years", label: "Zeithorizont", min: 1, max: 40, step: 1, suffix: " Jahre" },
    { kind: "range", key: "inflation", label: "Angenommene Inflation p.a.", min: 0, max: 8, step: 0.1, suffix: " %" },
  ],
  kosten: [
    { kind: "money", key: "capital", label: "Startkapital" },
    { kind: "money", key: "monthly", label: "Monatliche Sparrate" },
    { kind: "range", key: "years", label: "Anlagehorizont", min: 1, max: 40, step: 1, suffix: " Jahre" },
    { kind: "range", key: "rate", label: "Bruttorendite p.a.", min: 0, max: 10, step: 0.1, suffix: " %" },
    { kind: "range", key: "ter", label: "Laufende Kosten (TER) p.a.", min: 0, max: 3, step: 0.1, suffix: " %" },
  ],
  ziel: [
    { kind: "money", key: "capital", label: "Startkapital" },
    { kind: "money", key: "target", label: "Zielvermögen" },
    { kind: "range", key: "years", label: "Anlagehorizont", min: 1, max: 40, step: 1, suffix: " Jahre" },
    { kind: "range", key: "rate", label: "Erwartete Rendite p.a.", min: 0, max: 10, step: 0.1, suffix: " %" },
  ],
  "3a": [
    { kind: "money", key: "contribution", label: "Jährliche Einzahlung" },
    { kind: "range", key: "years", label: "Anlagehorizont", min: 1, max: 40, step: 1, suffix: " Jahre" },
    { kind: "range", key: "tax", label: "Grenzsteuersatz", min: 0, max: 45, step: 1, suffix: " %" },
  ],
  steuer: [
    { kind: "money", key: "income", label: "Steuerbares Einkommen" },
    { kind: "range", key: "tax", label: "Grenzsteuersatz", min: 0, max: 45, step: 1, suffix: " %" },
  ],
}

const LABELS: Record<WealthMode, [string, string, string]> = {
  inflation: ["Heute", "Kaufkraft danach", "Kaufkraftverlust"],
  ziel: ["Zielvermögen", "Nötige Sparrate / Monat", "Einzahlungen"],
  "3a": ["Steuerersparnis / Jahr", "Vermögen bei 4 %", "Einzahlungen"],
  steuer: ["Geschätzte Abgabenwirkung", "Nach Abzug", "Grenzsteuersatz"],
  zins: ["Endwert Rendite 1", "Einzahlungen", "Endwert Rendite 2"],
  start: ["Sofort starten", "Einzahlungen", "Später starten"],
  kosten: ["Vor Kosten", "Einzahlungen", "Nach TER"],
  sparen: ["Endvermögen", "Einzahlungen", "Ertrag"],
}

function compute(mode: WealthMode, d: Data) {
  let a = 0
  let b = 0
  let c = 0
  if (mode === "inflation") {
    a = d.capital
    b = d.capital / Math.pow(1 + d.inflation / 100, d.years)
    c = a - b
  } else if (mode === "ziel") {
    const m = d.rate / 1200
    const n = d.years * 12
    const capgrow = d.capital * Math.pow(1 + m, n)
    a = d.target
    b = m ? Math.max(0, ((a - capgrow) * m) / (Math.pow(1 + m, n) - 1)) : Math.max(0, (a - d.capital) / n)
    c = d.capital + b * n
  } else if (mode === "3a") {
    a = (d.contribution * d.tax) / 100
    b = fv(0, d.contribution / 12, d.years, 4)
    c = d.contribution * d.years
  } else if (mode === "steuer") {
    a = (d.income * d.tax) / 100
    b = d.income - a
    c = d.tax
  } else {
    a = fv(d.capital, d.monthly, d.years, d.rate)
    b = d.capital + d.monthly * 12 * d.years
    if (mode === "zins") c = fv(d.capital, d.monthly, d.years, d.rate2)
    else if (mode === "start") c = fv(d.capital, d.monthly, Math.max(0, d.years - d.delay), d.rate)
    else if (mode === "kosten") c = fv(d.capital, d.monthly, d.years, Math.max(0, d.rate - d.ter))
    else c = a - b
  }
  return { a, b, c }
}

function buildSeries(mode: WealthMode, d: Data) {
  const yrs = mode === "steuer" ? 1 : d.years
  const s1: number[] = []
  const s2: number[] = []
  const hasCompare = mode !== "inflation" && mode !== "steuer"
  const targetResult = mode === "ziel" ? compute(mode, d).b : 0
  for (let y = 0; y <= yrs; y++) {
    const v =
      mode === "inflation"
        ? d.capital / Math.pow(1 + d.inflation / 100, y)
        : mode === "ziel"
          ? fv(d.capital, targetResult, y, d.rate)
          : mode === "3a"
            ? fv(0, d.contribution / 12, y, 4)
            : mode === "steuer"
              ? d.income
              : fv(d.capital, d.monthly || 0, y, d.rate || 0)
    const v2 =
      mode === "zins"
        ? fv(d.capital, d.monthly, y, d.rate2)
        : mode === "start"
          ? fv(d.capital, d.monthly, Math.max(0, y - d.delay), d.rate)
          : mode === "kosten"
            ? fv(d.capital, d.monthly, y, Math.max(0, d.rate - d.ter))
            : mode === "ziel"
              ? d.capital + targetResult * 12 * y
              : mode === "3a"
                ? d.contribution * y
                : mode === "sparen"
                  ? d.capital + d.monthly * 12 * y
                  : mode === "steuer"
                    ? d.income - (d.income * d.tax) / 100
                    : 0
    s1.push(v)
    s2.push(v2)
  }
  return { s1, s2, hasCompare }
}

function chartLabels(mode: WealthMode) {
  const labels: Record<WealthMode, [string, string?]> = {
    sparen: ["Vermögensentwicklung", "Ihre Einzahlungen"],
    zins: ["Rendite 1", "Rendite 2"],
    start: ["Sofort starten", "Später starten"],
    inflation: ["Kaufkraft"],
    kosten: ["Vor Kosten", "Nach laufenden Kosten"],
    ziel: ["Zielentwicklung", "Ihre Einzahlungen"],
    "3a": ["Vorsorgevermögen", "Ihre Einzahlungen"],
    steuer: ["Einkommen", "Nach Abzug"],
  }
  return labels[mode]
}

function buildReportInputs(mode: WealthMode, d: Data) {
  const reportKeys: Record<keyof Data, string> = {
    capital: mode === "inflation" ? "heutiger_betrag" : "startkapital",
    monthly: "sparrate_monat",
    years: "anlagehorizont",
    rate: "rendite_pa",
    rate2: "rendite_2_pa",
    delay: "verzoegerung",
    inflation: "inflation_pa",
    ter: "ter_pa",
    target: "zielvermoegen",
    income: "steuerbares_einkommen",
    contribution: "jahresbeitrag",
    tax: "grenzsteuersatz",
  }

  return Object.fromEntries([
    ["modus", MODES[mode].t],
    ...FIELDS[mode].map((field) => [reportKeys[field.key], d[field.key]]),
  ])
}

export function VermoegenCalc({ mode, ctx }: { mode: WealthMode; ctx?: CalcContext }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [d, setD] = useState<Data>(DEFAULTS)

  const { a, b, c } = useMemo(() => compute(mode, d), [mode, d])
  const { s1, s2, hasCompare } = useMemo(() => buildSeries(mode, d), [mode, d])
  const labels = LABELS[mode]

  const set = (key: keyof Data, v: number) => setD((prev) => ({ ...prev, [key]: v }))

  const fmtVal = (mode: WealthMode, idx: number, v: number) =>
    mode === "steuer" && idx === 2 ? `${Math.round(v)} %` : formatCHF(v)

  return (
    <>
      <CalcActionBar
        ctx={ctx ?? {}}
        calcKey={`wealth-${mode}`}
        buildPayload={() => ({
          calculator: `wealth-${mode}`,
          inputs: buildReportInputs(mode, d),
          results: [
            `${labels[0]}: ${fmtVal(mode, 0, a)}`,
            `${labels[1]}: ${fmtVal(mode, 1, b)}`,
            `${labels[2]}: ${fmtVal(mode, 2, c)}`,
          ],
        })}
        onReset={() => setD(DEFAULTS)}
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {ORDER.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString())
              params.set("tool", k)
              router.push(`${pathname}?${params.toString()}`)
            }}
            aria-pressed={k === mode}
            className={`rounded-lg border px-3 py-2 text-[12px] font-bold transition-colors ${
              k === mode
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {MODES[k].t}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[13.5px] text-muted-foreground">{MODES[mode].d}</p>

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* Inputs */}
        <div className="rounded-2xl border border-border bg-card p-5">
          {FIELDS[mode].map((field) =>
            field.kind === "money" ? (
              <div key={field.key} className="mb-5 last:mb-0">
                <label className="mb-1.5 block text-[13px] font-semibold text-foreground">{field.label}</label>
                <div className="flex items-center overflow-hidden rounded-xl border border-border">
                  <span className="px-3 text-[12px] text-muted-foreground">CHF</span>
                  <input
                    type="number"
                    min={0}
                    value={d[field.key]}
                    onChange={(e) => set(field.key, Math.max(0, Number(e.target.value) || 0))}
                    className="w-full border-0 bg-transparent px-2 py-2.5 text-sm font-bold tabular-nums text-foreground focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div key={field.key} className="mb-5 last:mb-0">
                <div className="flex items-baseline justify-between">
                  <label className="text-[13px] font-semibold text-foreground">{field.label}</label>
                  <span className="text-sm font-bold text-primary tabular-nums">
                    {field.step < 1 ? d[field.key].toFixed(1) : d[field.key]}
                    {field.suffix}
                  </span>
                </div>
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={d[field.key]}
                  onChange={(e) => set(field.key, Number(e.target.value))}
                  className="mt-2 w-full accent-[var(--primary)]"
                />
              </div>
            ),
          )}
        </div>

        {/* Results */}
        <section aria-live="polite" className="rounded-2xl border border-border bg-card p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Metric label={labels[0]} value={fmtVal(mode, 0, a)} highlight />
            <Metric label={labels[1]} value={fmtVal(mode, 1, b)} />
            <Metric label={labels[2]} value={fmtVal(mode, 2, c)} />
          </div>

          <LineChart mode={mode} s1={s1} s2={s2} hasCompare={hasCompare} />

          <p className="mt-4 text-[12.5px] text-muted-foreground">
            Modellrechnung mit konstanter Rendite ohne Gewähr. Tatsächliche Erträge schwanken; Steuern und Gebühren
            sind vereinfacht dargestellt.
          </p>
        </section>
      </div>
    </>
  )
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-primary/30 bg-accent" : "border-border bg-background"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-black tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  )
}

function LineChart({
  mode,
  s1,
  s2,
  hasCompare,
}: {
  mode: WealthMode
  s1: number[]
  s2: number[]
  hasCompare: boolean
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const gradientId = useId().replace(/:/g, "")
  const [label1, label2] = chartLabels(mode)
  const W = 760
  const H = 330
  const pad = { l: 72, r: 22, t: 26, b: 44 }
  const all = hasCompare ? [...s1, ...s2] : s1
  const max = Math.max(1, ...all)
  const n = s1.length - 1 || 1
  const plotWidth = W - pad.l - pad.r
  const plotHeight = H - pad.t - pad.b
  const xAt = (i: number) => pad.l + (i / n) * plotWidth
  const yAt = (value: number) => pad.t + (1 - value / max) * plotHeight
  const compact = (value: number) => {
    if (value >= 1_000_000) return `CHF ${(value / 1_000_000).toFixed(1)} Mio.`
    if (value >= 1_000) return `CHF ${Math.round(value / 1_000)}k`
    return formatCHF(value)
  }

  const toPath = (series: number[]) =>
    series
      .map((value, index) => {
        const x = xAt(index)
        const y = yAt(value)
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(" ")

  if (mode === "steuer") {
    const gross = s1[0] || 1
    const afterTax = s2[0] || 0
    const tax = Math.max(0, gross - afterTax)
    return (
      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-foreground">Einkommen nach Abgabenwirkung</h3>
            <p className="mt-1 text-xs text-muted-foreground">So teilt sich der eingegebene Betrag rechnerisch auf.</p>
          </div>
          <strong className="text-lg font-black tabular-nums text-foreground">{formatCHF(afterTax)}</strong>
        </div>
        <div className="mt-5 flex h-5 overflow-hidden rounded-full bg-muted">
          <span className="h-full bg-primary" style={{ width: `${(afterTax / gross) * 100}%` }} />
          <span className="h-full bg-[#f59e42]" style={{ width: `${(tax / gross) * 100}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <i className="h-2.5 w-2.5 rounded-full bg-primary" /> Nach Abzug {formatCHF(afterTax)}
          </span>
          <span className="inline-flex items-center gap-2">
            <i className="h-2.5 w-2.5 rounded-full bg-[#f59e42]" /> Abgabenwirkung {formatCHF(tax)}
          </span>
        </div>
      </div>
    )
  }

  const areaPath = `${toPath(s1)} L${(W - pad.r).toFixed(1)},${(H - pad.b).toFixed(1)} L${pad.l.toFixed(1)},${(H - pad.b).toFixed(1)} Z`
  const xTicks = Array.from(new Set([0, Math.round(n / 4), Math.round(n / 2), Math.round((n * 3) / 4), n]))
  const yTicks = [0, 0.25, 0.5, 0.75, 1]
  const active = hoverIndex ?? n
  const activeX = xAt(active)
  const tooltipWidth = 176
  const tooltipX = Math.min(Math.max(activeX - tooltipWidth / 2, pad.l), W - pad.r - tooltipWidth)

  return (
    <div className="mt-6 rounded-2xl border border-border bg-background p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-foreground">Entwicklung über die Zeit</h3>
          <p className="mt-1 text-xs text-muted-foreground">Fahren Sie über die Kurve, um den Wert jedes Jahres zu sehen.</p>
        </div>
        <div className="flex flex-wrap gap-4 text-[11.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-full bg-primary" /> {label1}
          </span>
          {hasCompare && label2 ? (
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-full bg-[#f59e42]" /> {label2}
            </span>
          ) : null}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none"
        role="img"
        aria-label={`${label1} nach Jahren`}
        onPointerLeave={() => setHoverIndex(null)}
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect()
          const localX = ((event.clientX - bounds.left) / bounds.width) * W
          const index = Math.round(((localX - pad.l) / plotWidth) * n)
          setHoverIndex(Math.max(0, Math.min(n, index)))
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.015" />
          </linearGradient>
        </defs>

        {yTicks.map((ratio) => {
          const gridY = pad.t + (1 - ratio) * plotHeight
          return (
            <g key={ratio}>
              <line x1={pad.l} x2={W - pad.r} y1={gridY} y2={gridY} stroke="var(--border)" strokeWidth="1" />
              <text x={pad.l - 12} y={gridY + 4} textAnchor="end" fill="var(--muted-foreground)" fontSize="10">
                {compact(max * ratio)}
              </text>
            </g>
          )
        })}
        {xTicks.map((tick) => (
          <text
            key={tick}
            x={xAt(tick)}
            y={H - 14}
            textAnchor="middle"
            fill="var(--muted-foreground)"
            fontSize="10"
          >
            Jahr {tick}
          </text>
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        {hasCompare ? (
          <path
            d={toPath(s2)}
            fill="none"
            stroke="#f59e42"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        <path
          d={toPath(s1)}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <line
          x1={activeX}
          x2={activeX}
          y1={pad.t}
          y2={H - pad.b}
          stroke="var(--foreground)"
          strokeDasharray="4 5"
          strokeOpacity={hoverIndex == null ? 0 : 0.32}
        />
        <circle cx={activeX} cy={yAt(s1[active])} r="5" fill="var(--card)" stroke="var(--primary)" strokeWidth="3" />
        {hasCompare ? (
          <circle cx={activeX} cy={yAt(s2[active])} r="4.5" fill="var(--card)" stroke="#f59e42" strokeWidth="3" />
        ) : null}

        {hoverIndex != null ? (
          <g pointerEvents="none">
            <rect
              x={tooltipX}
              y={34}
              width={tooltipWidth}
              height={hasCompare ? 76 : 58}
              rx="12"
              fill="var(--card)"
              stroke="var(--border)"
            />
            <text x={tooltipX + 14} y={54} fill="var(--muted-foreground)" fontSize="10" fontWeight="700">
              JAHR {active}
            </text>
            <circle cx={tooltipX + 16} cy={72} r="4" fill="var(--primary)" />
            <text x={tooltipX + 28} y={76} fill="var(--foreground)" fontSize="11" fontWeight="700">
              {compact(s1[active])}
            </text>
            {hasCompare ? (
              <>
                <circle cx={tooltipX + 16} cy={94} r="4" fill="#f59e42" />
                <text x={tooltipX + 28} y={98} fill="var(--foreground)" fontSize="11" fontWeight="700">
                  {compact(s2[active])}
                </text>
              </>
            ) : null}
          </g>
        ) : null}
        <rect x={pad.l} y={pad.t} width={plotWidth} height={plotHeight} fill="transparent" />
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
        <span className="text-muted-foreground">Wert am Ende</span>
        <span className="font-extrabold tabular-nums text-foreground">{formatCHF(s1[n])}</span>
      </div>
    </div>
  )
}

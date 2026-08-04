"use client"

import { useId, useMemo, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { formatCHF } from "@/lib/format"
import {
  futureValue,
  monthsToTarget,
  netReturnAfterCosts,
  purchasingPower,
} from "@/lib/engine/wealth"
import { CalcActionBar, type CalcContext, type SavedCalculatorPayload } from "@/components/portal/rechner/calc-action-bar"

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
  kosten: { t: "TER-Vergleich", d: "Vergleichen Sie zwei Anlagen mit unterschiedlicher TER bei gleicher Bruttorendite." },
  ziel: { t: "Zielvermögensrechner", d: "Sehen Sie, wann Sie Ihr Ziel mit Startkapital und monatlicher Sparrate erreichen." },
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
  ter2: number
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
  ter2: 1.5,
  target: 500000,
  income: 100000,
  contribution: 7258,
  tax: 25,
}

type FieldDef =
  | { kind: "money"; key: keyof Data; label: string }
  | { kind: "range"; key: keyof Data; label: string; min: number; max: number; step: number; suffix?: string }

const FIELDS: Record<WealthMode, FieldDef[]> = {
  sparen: [
    { kind: "money", key: "capital", label: "Startkapital" },
    { kind: "money", key: "monthly", label: "Monatliche Sparrate" },
    { kind: "range", key: "years", label: "Anlagehorizont", min: 1, max: 70, step: 1, suffix: " Jahre" },
    { kind: "range", key: "rate", label: "Erwartete Rendite p.a.", min: 0, max: 25, step: 0.1, suffix: " %" },
  ],
  zins: [
    { kind: "money", key: "capital", label: "Startkapital" },
    { kind: "money", key: "monthly", label: "Monatliche Sparrate" },
    { kind: "range", key: "years", label: "Anlagehorizont", min: 1, max: 70, step: 1, suffix: " Jahre" },
    { kind: "range", key: "rate", label: "Rendite 1 p.a.", min: 0, max: 25, step: 0.1, suffix: " %" },
    { kind: "range", key: "rate2", label: "Rendite 2 p.a.", min: 0, max: 25, step: 0.1, suffix: " %" },
  ],
  start: [
    { kind: "money", key: "capital", label: "Startkapital" },
    { kind: "money", key: "monthly", label: "Monatliche Sparrate" },
    { kind: "range", key: "years", label: "Anlagehorizont", min: 1, max: 70, step: 1, suffix: " Jahre" },
    { kind: "range", key: "rate", label: "Erwartete Rendite p.a.", min: 0, max: 25, step: 0.1, suffix: " %" },
    { kind: "range", key: "delay", label: "Verzögerter Start", min: 0, max: 50, step: 1, suffix: " Jahre" },
  ],
  inflation: [
    { kind: "money", key: "capital", label: "Heutiger Betrag" },
    { kind: "range", key: "years", label: "Zeithorizont", min: 1, max: 70, step: 1, suffix: " Jahre" },
    { kind: "range", key: "inflation", label: "Angenommene Inflation p.a.", min: 0, max: 8, step: 0.1, suffix: " %" },
  ],
  kosten: [
    { kind: "money", key: "capital", label: "Startkapital" },
    { kind: "money", key: "monthly", label: "Monatliche Sparrate" },
    { kind: "range", key: "years", label: "Anlagehorizont", min: 1, max: 70, step: 1, suffix: " Jahre" },
    { kind: "range", key: "rate", label: "Bruttorendite p.a.", min: 0, max: 25, step: 0.1, suffix: " %" },
    { kind: "range", key: "ter", label: "TER Anlage 1 p.a.", min: 0, max: 5, step: 0.1, suffix: " %" },
    { kind: "range", key: "ter2", label: "TER Anlage 2 p.a.", min: 0, max: 5, step: 0.1, suffix: " %" },
  ],
  ziel: [
    { kind: "money", key: "capital", label: "Startkapital" },
    { kind: "money", key: "monthly", label: "Monatliche Sparrate" },
    { kind: "money", key: "target", label: "Zielvermögen" },
    { kind: "range", key: "rate", label: "Erwartete Rendite p.a.", min: 0, max: 25, step: 0.1, suffix: " %" },
  ],
  "3a": [
    { kind: "money", key: "contribution", label: "Jährliche Einzahlung (mit PK max. CHF 7’258)" },
    { kind: "range", key: "years", label: "Anlagehorizont", min: 1, max: 70, step: 1, suffix: " Jahre" },
    { kind: "range", key: "rate", label: "Erwartete Rendite p.a.", min: 0, max: 25, step: 0.1, suffix: " %" },
    { kind: "range", key: "tax", label: "Grenzsteuersatz", min: 0, max: 45, step: 1, suffix: " %" },
  ],
  steuer: [
    { kind: "money", key: "income", label: "Steuerbares Einkommen" },
    { kind: "range", key: "tax", label: "Grenzsteuersatz", min: 0, max: 45, step: 1, suffix: " %" },
  ],
}

const LABELS: Record<WealthMode, [string, string, string]> = {
  inflation: ["Heute", "Kaufkraft danach", "Kaufkraftverlust"],
  ziel: ["Ziel erreicht in", "Einzahlungen", "Davon Rendite"],
  "3a": ["Steuerersparnis / Jahr", "Vorsorgevermögen", "Einzahlungen"],
  steuer: ["Geschätzte Abgabenwirkung", "Nach Abzug", "Grenzsteuersatz"],
  zins: ["Endwert Rendite 1", "Einzahlungen", "Endwert Rendite 2"],
  start: ["Sofort starten", "Einzahlungen", "Später starten"],
  kosten: ["Nach TER 1", "Nach TER 2", "Vorteil tiefere TER"],
  sparen: ["Endvermögen", "Einzahlungen", "Ertrag"],
}

function compute(mode: WealthMode, d: Data) {
  let a = 0
  let b = 0
  let c = 0
  if (mode === "inflation") {
    a = d.capital
    b = purchasingPower(d.capital, d.years, d.inflation)
    c = a - b
  } else if (mode === "ziel") {
    a = monthsToTarget({
      capital: d.capital,
      monthly: d.monthly,
      target: d.target,
      annualRatePct: d.rate,
    })
    b = Number.isFinite(a) ? d.capital + d.monthly * a : 0
    c = Number.isFinite(a) ? Math.max(0, d.target - b) : 0
  } else if (mode === "3a") {
    a = (d.contribution * d.tax) / 100
    b = futureValue({ capital: 0, monthly: d.contribution / 12, years: d.years, annualRatePct: d.rate })
    c = d.contribution * d.years
  } else if (mode === "steuer") {
    a = (d.income * d.tax) / 100
    b = d.income - a
    c = d.tax
  } else {
    a = futureValue({ capital: d.capital, monthly: d.monthly, years: d.years, annualRatePct: d.rate })
    b = d.capital + d.monthly * 12 * d.years
    if (mode === "zins") {
      c = futureValue({ capital: d.capital, monthly: d.monthly, years: d.years, annualRatePct: d.rate2 })
    } else if (mode === "start") {
      c = futureValue({
        capital: d.capital,
        monthly: d.monthly,
        years: Math.max(0, d.years - d.delay),
        annualRatePct: d.rate,
      })
    } else if (mode === "kosten") {
      a = futureValue({
        capital: d.capital,
        monthly: d.monthly,
        years: d.years,
        annualRatePct: netReturnAfterCosts(d.rate, d.ter),
      })
      b = futureValue({
        capital: d.capital,
        monthly: d.monthly,
        years: d.years,
        annualRatePct: netReturnAfterCosts(d.rate, d.ter2),
      })
      c = Math.abs(a - b)
    }
    else c = a - b
  }
  return { a, b, c }
}

function buildSeries(mode: WealthMode, d: Data) {
  const targetMonths = mode === "ziel" ? compute(mode, d).a : 0
  const targetYears = Number.isFinite(targetMonths) ? Math.max(0, targetMonths / 12) : 70
  const yrs = mode === "steuer" ? 1 : mode === "ziel" ? targetYears : d.years
  const times =
    mode === "ziel" && Number.isFinite(targetMonths)
      ? [
          ...Array.from({ length: Math.floor(targetYears) + 1 }, (_, year) => year),
          ...(targetYears % 1 > 0 ? [targetYears] : []),
        ]
      : Array.from({ length: Math.floor(yrs) + 1 }, (_, year) => year)
  const s1: number[] = []
  const s2: number[] = []
  const hasCompare = mode !== "inflation" && mode !== "steuer"
  for (const y of times) {
    const v =
      mode === "inflation"
        ? purchasingPower(d.capital, y, d.inflation)
        : mode === "ziel"
          ? futureValue({ capital: d.capital, monthly: d.monthly, years: y, annualRatePct: d.rate })
          : mode === "kosten"
            ? futureValue({
                capital: d.capital,
                monthly: d.monthly,
                years: y,
                annualRatePct: netReturnAfterCosts(d.rate, d.ter),
              })
          : mode === "3a"
            ? futureValue({ capital: 0, monthly: d.contribution / 12, years: y, annualRatePct: d.rate })
            : mode === "steuer"
              ? d.income
              : futureValue({ capital: d.capital, monthly: d.monthly || 0, years: y, annualRatePct: d.rate || 0 })
    const v2 =
      mode === "zins"
        ? futureValue({ capital: d.capital, monthly: d.monthly, years: y, annualRatePct: d.rate2 })
        : mode === "start"
          ? futureValue({
              capital: d.capital,
              monthly: d.monthly,
              years: Math.max(0, y - d.delay),
              annualRatePct: d.rate,
            })
          : mode === "kosten"
            ? futureValue({
                capital: d.capital,
                monthly: d.monthly,
                years: y,
                annualRatePct: netReturnAfterCosts(d.rate, d.ter2),
              })
            : mode === "ziel"
              ? d.capital + d.monthly * 12 * y
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
  return { s1, s2, hasCompare, times }
}

function chartLabels(mode: WealthMode, d: Data) {
  const labels: Record<WealthMode, [string, string?]> = {
    sparen: ["Vermögensentwicklung", "Ihre Einzahlungen"],
    zins: ["Rendite 1", "Rendite 2"],
    start: ["Sofort starten", "Später starten"],
    inflation: ["Kaufkraft"],
    kosten: [`Anlage 1 · TER ${d.ter.toFixed(1)} %`, `Anlage 2 · TER ${d.ter2.toFixed(1)} %`],
    ziel: ["Vermögensentwicklung", "Ihre Einzahlungen"],
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
    ter2: "ter_2_pa",
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

export function VermoegenCalc({ mode, ctx, saved }: { mode: WealthMode; ctx?: CalcContext; saved?: SavedCalculatorPayload }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const storedData = (saved?.inputs as Record<string, unknown> | undefined)?.data
  const restoredData = storedData && typeof storedData === "object" && !Array.isArray(storedData)
    ? Object.fromEntries(
        (Object.keys(DEFAULTS) as (keyof Data)[]).map((key) => [
          key,
          Number.isFinite(Number((storedData as Record<string, unknown>)[key]))
            ? Number((storedData as Record<string, unknown>)[key])
            : DEFAULTS[key],
        ]),
      ) as Data
    : DEFAULTS
  const [d, setD] = useState<Data>(restoredData)

  const { a, b, c } = useMemo(() => compute(mode, d), [mode, d])
  const { s1, s2, hasCompare, times } = useMemo(() => buildSeries(mode, d), [mode, d])
  const labels = LABELS[mode]

  const set = (key: keyof Data, v: number) => setD((prev) => ({ ...prev, [key]: v }))

  const fmtVal = (mode: WealthMode, idx: number, v: number) => {
    if (mode === "steuer" && idx === 2) return `${Math.round(v)} %`
    if (mode === "ziel" && idx === 0) {
      if (!Number.isFinite(v)) return "Nicht erreichbar"
      const months = Math.max(0, Math.round(v))
      const years = Math.floor(months / 12)
      const rest = months % 12
      if (!years) return `${rest} ${rest === 1 ? "Monat" : "Monate"}`
      if (!rest) return `${years} ${years === 1 ? "Jahr" : "Jahre"}`
      return `${years} J. ${rest} Mt.`
    }
    return formatCHF(v)
  }

  return (
    <>
      <CalcActionBar
        ctx={ctx ?? {}}
        calcKey={`wealth-${mode}`}
        buildPayload={() => ({
          calculator: `wealth-${mode}`,
          inputs: { ...buildReportInputs(mode, d), data: d },
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
                  <label className="flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-sm font-bold text-primary">
                    <input
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={d[field.key]}
                      onChange={(e) =>
                        set(field.key, Math.max(field.min, Math.min(field.max, Number(e.target.value) || field.min)))
                      }
                      className="w-16 bg-transparent text-right tabular-nums outline-none"
                      aria-label={`${field.label} direkt eingeben`}
                    />
                    <span>{field.suffix}</span>
                  </label>
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

          <LineChart mode={mode} data={d} s1={s1} s2={s2} times={times} hasCompare={hasCompare} />

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
  data,
  s1,
  s2,
  times,
  hasCompare,
}: {
  mode: WealthMode
  data: Data
  s1: number[]
  s2: number[]
  times: number[]
  hasCompare: boolean
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const gradientId = useId().replace(/:/g, "")
  const [label1, label2] = chartLabels(mode, data)
  const W = 760
  const H = 330
  const pad = { l: 72, r: 22, t: 26, b: 44 }
  const all = hasCompare ? [...s1, ...s2] : s1
  const max = Math.max(1, ...all)
  const n = s1.length - 1 || 1
  const maxTime = Math.max(1, times[times.length - 1] ?? n)
  const plotWidth = W - pad.l - pad.r
  const plotHeight = H - pad.t - pad.b
  const xAt = (i: number) => pad.l + ((times[i] ?? i) / maxTime) * plotWidth
  const yAt = (value: number) => pad.t + (1 - value / max) * plotHeight
  const formatTime = (value: number) => {
    const months = Math.max(0, Math.round(value * 12))
    const years = Math.floor(months / 12)
    const rest = months % 12
    if (!rest) return `Jahr ${years}`
    return `${years} J. ${rest} Mt.`
  }
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
  const active = Math.min(hoverIndex ?? n, n)
  const activeX = xAt(active)

  return (
    <figure className="mt-6 rounded-2xl border border-border bg-background p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-foreground">Entwicklung über die Zeit</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Bewegen Sie den Regler oder fahren Sie über die Kurve – die Werte bleiben immer sichtbar.
          </p>
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

      <div
        className="mb-3 grid gap-2 rounded-2xl border border-[#dce5f3] bg-[#f7faff] p-3 sm:grid-cols-[100px_1fr_1fr]"
        aria-live="polite"
      >
        <div className="flex items-center rounded-xl bg-[#e8f0ff] px-3 py-2">
          <div>
            <span className="block text-[10px] font-extrabold uppercase tracking-wide text-[#587096]">Zeitpunkt</span>
            <strong className="text-base text-[#111d36]">{formatTime(times[active] ?? active)}</strong>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 shadow-sm">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#52617a]">
            <i className="h-2.5 w-2.5 rounded-full bg-[#3978f6]" /> {label1}
          </span>
          <strong className="whitespace-nowrap text-sm tabular-nums text-[#111d36]">{formatCHF(s1[active])}</strong>
        </div>
        {hasCompare && label2 ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 shadow-sm">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#52617a]">
              <i className="h-2.5 w-2.5 rounded-full bg-[#f59e42]" /> {label2}
            </span>
            <strong className="whitespace-nowrap text-sm tabular-nums text-[#111d36]">{formatCHF(s2[active])}</strong>
          </div>
        ) : (
          <div className="hidden sm:block" />
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none"
        role="img"
        aria-label={`${label1} nach Jahren`}
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect()
          const localX = ((event.clientX - bounds.left) / bounds.width) * W
          const hoveredTime = Math.max(0, Math.min(maxTime, ((localX - pad.l) / plotWidth) * maxTime))
          const index = times.reduce(
            (closest, time, candidate) =>
              Math.abs(time - hoveredTime) < Math.abs((times[closest] ?? 0) - hoveredTime) ? candidate : closest,
            0,
          )
          setHoverIndex(Math.max(0, Math.min(n, index)))
        }}
      >
        <title>
          {label1}: nach {formatTime(times[active] ?? active)} {formatCHF(s1[active])}
          {hasCompare && label2 ? `; ${label2}: ${formatCHF(s2[active])}` : ""}
        </title>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3978f6" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#3978f6" stopOpacity="0.025" />
          </linearGradient>
        </defs>

        {yTicks.map((ratio) => {
          const gridY = pad.t + (1 - ratio) * plotHeight
          return (
            <g key={ratio}>
              <line x1={pad.l} x2={W - pad.r} y1={gridY} y2={gridY} stroke="#dce4ef" strokeWidth="1" />
              <text x={pad.l - 12} y={gridY + 4} textAnchor="end" fill="#65748b" fontSize="11" fontWeight="600">
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
            fill="#65748b"
            fontSize="11"
            fontWeight="600"
          >
            {formatTime(times[tick] ?? tick)}
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
          stroke="#3978f6"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <line
          x1={activeX}
          x2={activeX}
          y1={pad.t}
          y2={H - pad.b}
          stroke="#111d36"
          strokeDasharray="4 5"
          strokeOpacity="0.28"
        />
        <circle cx={activeX} cy={yAt(s1[active])} r="5" fill="#ffffff" stroke="#3978f6" strokeWidth="3" />
        {hasCompare ? (
          <circle cx={activeX} cy={yAt(s2[active])} r="4.5" fill="#ffffff" stroke="#f59e42" strokeWidth="3" />
        ) : null}

        <rect x={pad.l} y={pad.t} width={plotWidth} height={plotHeight} fill="transparent" />
      </svg>

      <div className="mt-2">
        <label className="flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
          <span>Jahr auswählen</span>
          <span className="font-extrabold tabular-nums text-foreground">
            {formatTime(times[active] ?? active)} / {formatTime(times[n] ?? n)}
          </span>
        </label>
        <input
          type="range"
          min={0}
          max={n}
          step={1}
          value={active}
          onChange={(event) => setHoverIndex(Number(event.target.value))}
          className="mt-2 w-full accent-[var(--color-primary)]"
          aria-label="Jahr im Diagramm auswählen"
        />
      </div>

      <details className="mt-4 border-t border-border pt-3">
        <summary className="cursor-pointer text-xs font-bold text-primary">Alle Jahreswerte anzeigen</summary>
        <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-border">
          <table className="w-full min-w-[440px] text-left text-xs">
            <thead className="sticky top-0 bg-[#eef3fb] text-[#52617a]">
              <tr>
                <th className="px-3 py-2 font-bold">Jahr</th>
                <th className="px-3 py-2 text-right font-bold">{label1}</th>
                {hasCompare && label2 ? <th className="px-3 py-2 text-right font-bold">{label2}</th> : null}
              </tr>
            </thead>
            <tbody>
              {s1.map((value, index) => (
                <tr key={index} className="border-t border-border bg-white">
                  <td className="px-3 py-2 font-semibold text-foreground">{formatTime(times[index] ?? index)}</td>
                  <td className="px-3 py-2 text-right font-bold tabular-nums text-foreground">{formatCHF(value)}</td>
                  {hasCompare && label2 ? (
                    <td className="px-3 py-2 text-right font-bold tabular-nums text-foreground">{formatCHF(s2[index])}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <figcaption className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
        Effektive Jahresrendite, monatliche Verzinsung und Sparbeiträge jeweils am Monatsende.
      </figcaption>
    </figure>
  )
}

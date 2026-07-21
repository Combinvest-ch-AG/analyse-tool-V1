"use client"

import { useMemo, useState } from "react"
import {
  CONFIGS,
  COLORS,
  RISK_LABELS,
  RISK_HEADINGS,
  computeGap,
  resolveValues,
  type Risk,
  type Cause,
  type AhvMode,
  type BvgMode,
  type ValuesByRisk,
  type ValueKey,
} from "@/lib/engine/pension-gap"
import { formatCHF } from "@/lib/format"
import { Lock, Upload, ChevronDown } from "lucide-react"
import { CalcActionBar, type CalcContext } from "@/components/portal/rechner/calc-action-bar"

const RISKS: Risk[] = ["iv", "retirement", "death"]

const RISK_DESCRIPTIONS: Record<Risk, string> = {
  iv: "Erwerbsunfähigkeit durch Krankheit oder Unfall",
  retirement: "Einkommen nach dem ordentlichen Rentenalter",
  death: "Absicherung der Hinterbliebenen",
}

function emptyValues(): ValuesByRisk {
  return { iv: {}, retirement: {}, death: {} }
}

interface Props {
  defaults?: {
    salary?: number
    age?: number
    children?: number
  }
  ctx?: CalcContext
}

export function PensionGapCalc({ defaults, ctx }: Props) {
  const [risk, setRisk] = useState<Risk>("iv")
  const [salary, setSalary] = useState(defaults?.salary ?? 90000)
  const [targetPct, setTargetPct] = useState(90)
  const [age, setAge] = useState(defaults?.age ?? 40)
  const [startAge, setStartAge] = useState(25)
  const [cause, setCause] = useState<Cause>("illness")
  const [degree, setDegree] = useState(100)
  const [children, setChildren] = useState(defaults?.children ?? 0)
  const [ahvMode, setAhvMode] = useState<AhvMode>("scale44")
  const [averageIncome, setAverageIncome] = useState(0)
  const [contributionGaps, setContributionGaps] = useState(0)
  const [bvgMode, setBvgMode] = useState<BvgMode>("minimum")
  const [manual, setManual] = useState<ValuesByRisk>(emptyValues())
  const [period, setPeriod] = useState<"year" | "month">("year")
  const [expert, setExpert] = useState(false)
  const [pkFileName, setPkFileName] = useState("")

  const inputs = {
    risk,
    salary,
    targetPct,
    cause,
    degree,
    ahvMode,
    averageIncome,
    contributionGaps,
    children,
    bvgMode,
    age,
    startAge,
  }

  const resolved = useMemo(() => resolveValues(inputs, manual), [
    risk, salary, targetPct, cause, degree, ahvMode, averageIncome, contributionGaps, children, bvgMode, age, startAge, manual,
  ])
  const gap = useMemo(() => computeGap(inputs, resolved.values), [inputs, resolved.values])

  function setValue(key: ValueKey, value: number) {
    setManual((prev) => ({ ...prev, [risk]: { ...prev[risk], [key]: value } }))
  }

  const coverPct = Math.round(gap.cover)
  const hasGap = gap.gap > 0
  const barSegments = gap.items.filter((i) => i.value > 0)
  const scaleMax = Math.max(gap.target, gap.total) || 1

  // Year/Month display switch (values are stored as annual amounts).
  const per = (v: number) => (period === "month" ? v / 12 : v)
  const perSuffix = period === "month" ? "/ Monat" : "/ Jahr"

  return (
    <>
    <CalcActionBar
      ctx={ctx ?? {}}
      calcKey="pension-gap"
      buildPayload={() => ({
        calculator: "pension-gap",
        inputs: { risk, salary, targetPct, age, cause, degree, children, ahvMode, bvgMode },
        results: [
          `Risiko ${RISK_LABELS[risk]}`,
          `Deckung ${coverPct} %`,
          hasGap ? `Deckungslücke ${formatCHF(gap.gap)}/Jahr` : "Keine Deckungslücke",
          `Ziel ${formatCHF(gap.target)}`,
          `Vorhandene Leistungen ${formatCHF(gap.total)}`,
        ],
      })}
      onReset={() => {
        setRisk("iv")
        setSalary(defaults?.salary ?? 90000)
        setTargetPct(90)
        setAge(defaults?.age ?? 40)
        setStartAge(25)
        setCause("illness")
        setDegree(100)
        setChildren(defaults?.children ?? 0)
        setAhvMode("scale44")
        setAverageIncome(0)
        setContributionGaps(0)
        setBvgMode("minimum")
        setManual(emptyValues())
        setPeriod("year")
        setExpert(false)
        setPkFileName("")
      }}
    />
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      {/* Inputs */}
      <div className="flex flex-col gap-6">
        {/* Risk switcher */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Vorsorgerisiko</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {RISKS.map((r) => {
              const active = risk === r
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRisk(r)}
                  aria-pressed={active}
                  className={`flex flex-col gap-1 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <span className={`text-sm font-bold ${active ? "text-primary" : "text-foreground"}`}>
                    {RISK_LABELS[r]}
                  </span>
                  <span className="text-xs leading-snug text-muted-foreground">{RISK_DESCRIPTIONS[r]}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Base inputs */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeading n={1} title="Einkommen & Grunddaten" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <MoneyInput label="Jahreslohn (brutto)" value={salary} onChange={setSalary} />
            <div>
              <label className="text-sm font-medium text-foreground">Zielrente: {targetPct} %</label>
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={targetPct}
                onChange={(e) => setTargetPct(Number(e.target.value))}
                className="mt-3 w-full accent-[var(--color-primary)]"
              />
            </div>
            <NumberInput label="Alter" value={age} onChange={setAge} min={18} max={65} />
            <NumberInput label="BVG-Eintrittsalter" value={startAge} onChange={setStartAge} min={18} max={age} />
          </div>
        </div>

        {/* Risk-specific inputs */}
        {risk === "iv" && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <SectionHeading n={2} title="Invaliditäts-Parameter" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className="text-sm font-medium text-foreground">Ursache</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["illness", "accident"] as Cause[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCause(c)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                        cause === c
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {c === "illness" ? "Krankheit" : "Unfall (UVG)"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">IV-Grad: {degree} %</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={degree}
                  onChange={(e) => setDegree(Number(e.target.value))}
                  className="mt-3 w-full accent-[var(--color-primary)]"
                />
              </div>
              <NumberInput label="Kinder" value={children} onChange={setChildren} min={0} max={10} />
            </div>
          </div>
        )}

        {risk === "death" && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <SectionHeading n={2} title="Todesfall-Parameter" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <NumberInput label="Kinder" value={children} onChange={setChildren} min={0} max={10} />
            </div>
          </div>
        )}

        {/* Automatic engine toggles */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeading n={3} title="Pensionskasse & automatische Berechnung" />

          {/* PK-Ausweis: switch to statement mode + reveal manual BVG fields */}
          <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-background px-4 py-3 transition-colors hover:border-primary/50">
            <span className="flex items-center gap-2.5">
              <Upload className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold text-foreground">
                {pkFileName ? pkFileName : "PK-Ausweis erfassen"}
              </span>
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {pkFileName ? "Werte manuell übertragen" : "PDF/Bild wählen"}
            </span>
            <input
              type="file"
              accept="application/pdf,image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                setPkFileName(f.name)
                setBvgMode("statement")
                setExpert(true)
              }}
            />
          </label>
          <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
            Übertragen Sie die Renten aus dem Vorsorgeausweis unten in die Expertenfelder. Ohne Ausweis rechnen wir mit
            dem BVG-Minimum.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <ToggleRow
              label="AHV/IV-Rente nach Skala 44"
              on={ahvMode === "scale44"}
              onToggle={() => setAhvMode(ahvMode === "scale44" ? "manual" : "scale44")}
            />
            {ahvMode === "scale44" && risk === "iv" && (
              <div className="grid gap-4 rounded-lg bg-background p-3 sm:grid-cols-2">
                <MoneyInput label="Ø Jahreseinkommen (optional)" value={averageIncome} onChange={setAverageIncome} />
                <NumberInput
                  label="Beitragslücken (Jahre)"
                  value={contributionGaps}
                  onChange={setContributionGaps}
                  min={0}
                  max={43}
                />
              </div>
            )}
            <ToggleRow
              label="BVG-Leistungen (Minimum) schätzen"
              on={bvgMode === "minimum"}
              onToggle={() => setBvgMode(bvgMode === "minimum" ? "statement" : "minimum")}
            />
          </div>
        </div>

        {/* Manual / resolved values — expert overrides */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <SectionHeading n={4} title={`${RISK_HEADINGS[risk]} (Jahresbeträge)`} />
            <button
              type="button"
              onClick={() => setExpert((v) => !v)}
              aria-expanded={expert}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              Expertenfelder
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${expert ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {CONFIGS[risk]
              .filter(([key]) => !(risk === "iv" && key === "uvg" && cause !== "accident"))
              .map(([key, name]) => {
                const locked = !!resolved.locked[key]
                const value = resolved.values[risk][key] || 0
                // Editable only in expert mode; otherwise show the resolved value read-only.
                const editable = expert && !locked
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: COLORS[key] }}
                      aria-hidden="true"
                    />
                    <label className="flex-1 text-sm text-foreground">{name}</label>
                    {editable ? (
                      <input
                        type="number"
                        inputMode="numeric"
                        value={value || ""}
                        onChange={(e) => setValue(key, Number(e.target.value) || 0)}
                        className="w-36 rounded-md border border-border bg-background px-3 py-1.5 text-right text-sm tabular-nums text-foreground focus:border-primary focus:outline-none"
                        placeholder="0"
                      />
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-sm font-semibold tabular-nums text-foreground">
                        {locked ? <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /> : null}
                        {formatCHF(value)}
                      </span>
                    )}
                  </div>
                )
              })}
          </div>
          {!expert && (
            <p className="mt-3 text-xs text-muted-foreground">
              Werte automatisch berechnet. Über „Expertenfelder" können Sie einzelne Renten aus dem Vorsorgeausweis
              überschreiben.
            </p>
          )}
          {resolved.childCapped && (
            <p className="mt-3 text-xs text-muted-foreground">
              Kinderrenten wurden auf die 90 %-Überentschädigungsgrenze gekürzt.
            </p>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Deckung {RISK_LABELS[risk]}</p>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                hasGap ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
              }`}
            >
              {coverPct} % gedeckt
            </span>
          </div>

          {/* Year / Month switch */}
          <div className="mt-4 inline-flex rounded-lg border border-border bg-background p-0.5 text-xs font-bold">
            {(["year", "month"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "year" ? "Pro Jahr" : "Pro Monat"}
              </button>
            ))}
          </div>

          {/* Key metrics */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Zielbedarf</p>
              <p className="mt-1 text-base font-bold tabular-nums text-foreground">{formatCHF(per(gap.target))}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Gesamtleistung</p>
              <p className="mt-1 text-base font-bold tabular-nums text-foreground">{formatCHF(per(gap.total))}</p>
            </div>
            <div className={`rounded-xl border p-3 ${hasGap ? "border-destructive/30 bg-destructive/5" : "border-success/30 bg-success/5"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Vorsorgelücke</p>
              <p className={`mt-1 text-base font-bold tabular-nums ${hasGap ? "text-destructive" : "text-success"}`}>
                {formatCHF(per(gap.gap))}
              </p>
            </div>
          </div>

          {/* Stacked bar vs target */}
          <div className="mt-5">
            <div className="relative h-9 w-full overflow-hidden rounded-lg bg-muted">
              <div className="flex h-full w-full">
                {barSegments.map((seg) => (
                  <div
                    key={seg.key}
                    style={{ width: `${(seg.value / scaleMax) * 100}%`, backgroundColor: COLORS[seg.key] }}
                    title={`${seg.name}: ${formatCHF(per(seg.value))} ${perSuffix}`}
                  />
                ))}
              </div>
              {/* target marker */}
              <div
                className="absolute inset-y-0 w-0.5 bg-foreground"
                style={{ left: `${(gap.target / scaleMax) * 100}%` }}
                aria-hidden="true"
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Vorhandene Leistungen: {formatCHF(per(gap.total))}</span>
              <span>Ziel: {formatCHF(per(gap.target))}</span>
            </div>
          </div>

          {/* Gap context line */}
          {hasGap ? (
            <p className="mt-4 rounded-xl bg-destructive/5 px-4 py-3 text-sm text-muted-foreground">
              Die Vorsorgelücke entspricht{" "}
              <span className="font-semibold text-foreground">
                {period === "month"
                  ? `${formatCHF(gap.gap)} pro Jahr`
                  : `${formatCHF(Math.round(gap.gap / 12))} pro Monat`}
              </span>
              .
            </p>
          ) : (
            <p className="mt-4 rounded-xl bg-success/5 px-4 py-3 text-sm font-semibold text-success">
              Keine Deckungslücke – die Leistungen erreichen den Zielbedarf.
            </p>
          )}

          {/* Item legend */}
          <ul className="mt-5 flex flex-col gap-2">
            {gap.items.map((item) => (
              <li key={item.key} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[item.key] }} aria-hidden="true" />
                  {item.name}
                </span>
                <span className="font-semibold tabular-nums text-foreground">{formatCHF(per(item.value))}</span>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
            Richtwerte auf Basis AHV-Skala 44 (2025/2026) und BVG-Mindestgutschriften. Massgebend sind der individuelle
            Vorsorgeausweis und die definitiven Verfügungen.
          </p>
        </div>
      </div>
    </div>
    </>
  )
}

function SectionHeading({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-extrabold text-primary-foreground">
        {n}
      </span>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
    </div>
  )
}

function MoneyInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="mt-1.5 flex items-center rounded-md border border-border bg-background focus-within:border-primary">
        <span className="pl-3 text-sm text-muted-foreground">CHF</span>
        <input
          type="number"
          inputMode="numeric"
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full bg-transparent px-2 py-2 text-right text-sm tabular-nums text-foreground focus:outline-none"
          placeholder="0"
        />
      </div>
    </div>
  )
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm tabular-nums text-foreground focus:border-primary focus:outline-none"
      />
    </div>
  )
}

function ToggleRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between gap-3 text-left"
      aria-pressed={on}
    >
      <span className="text-sm text-foreground">{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            on ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  )
}

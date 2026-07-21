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
import { Lock } from "lucide-react"

const RISKS: Risk[] = ["iv", "retirement", "death"]

function emptyValues(): ValuesByRisk {
  return { iv: {}, retirement: {}, death: {} }
}

interface Props {
  defaults?: {
    salary?: number
    age?: number
    children?: number
  }
}

export function PensionGapCalc({ defaults }: Props) {
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      {/* Inputs */}
      <div className="flex flex-col gap-6">
        {/* Risk switcher */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Vorsorgerisiko</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {RISKS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRisk(r)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  risk === r
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                {RISK_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {/* Base inputs */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Grunddaten</p>
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Invaliditäts-Parameter
            </p>
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Todesfall-Parameter</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <NumberInput label="Kinder" value={children} onChange={setChildren} min={0} max={10} />
            </div>
          </div>
        )}

        {/* Automatic engine toggles */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Automatische Berechnung
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

        {/* Manual / resolved values */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {RISK_HEADINGS[risk]} (Jahresbeträge)
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {CONFIGS[risk]
              .filter(([key]) => !(risk === "iv" && key === "uvg" && cause !== "accident"))
              .map(([key, name]) => {
                const locked = !!resolved.locked[key]
                const value = resolved.values[risk][key] || 0
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: COLORS[key] }}
                      aria-hidden="true"
                    />
                    <label className="flex-1 text-sm text-foreground">{name}</label>
                    {locked ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-sm font-semibold tabular-nums text-foreground">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        {formatCHF(value)}
                      </span>
                    ) : (
                      <input
                        type="number"
                        inputMode="numeric"
                        value={value || ""}
                        onChange={(e) => setValue(key, Number(e.target.value) || 0)}
                        className="w-36 rounded-md border border-border bg-background px-3 py-1.5 text-right text-sm tabular-nums text-foreground focus:border-primary focus:outline-none"
                        placeholder="0"
                      />
                    )}
                  </div>
                )
              })}
          </div>
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
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Deckung {RISK_LABELS[risk]}</p>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                hasGap ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
              }`}
            >
              {coverPct} % gedeckt
            </span>
          </div>

          {/* Stacked bar vs target */}
          <div className="mt-5">
            <div className="relative h-9 w-full overflow-hidden rounded-lg bg-muted">
              <div className="flex h-full w-full">
                {barSegments.map((seg) => (
                  <div
                    key={seg.key}
                    style={{ width: `${(seg.value / scaleMax) * 100}%`, backgroundColor: COLORS[seg.key] }}
                    title={`${seg.name}: ${formatCHF(seg.value)}`}
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
              <span>Vorhandene Leistungen: {formatCHF(gap.total)}</span>
              <span>Ziel: {formatCHF(gap.target)}</span>
            </div>
          </div>

          {/* Gap headline */}
          <div className={`mt-5 rounded-xl p-4 ${hasGap ? "bg-destructive/5" : "bg-success/5"}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {hasGap ? "Jährliche Deckungslücke" : "Keine Deckungslücke"}
            </p>
            <p className={`mt-1 text-3xl font-bold tabular-nums ${hasGap ? "text-destructive" : "text-success"}`}>
              {hasGap ? formatCHF(gap.gap) : formatCHF(0)}
            </p>
            {hasGap && (
              <p className="mt-1 text-sm text-muted-foreground">
                entspricht {formatCHF(Math.round(gap.gap / 12))} pro Monat
              </p>
            )}
          </div>

          {/* Item legend */}
          <ul className="mt-5 flex flex-col gap-2">
            {gap.items.map((item) => (
              <li key={item.key} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[item.key] }} aria-hidden="true" />
                  {item.name}
                </span>
                <span className="font-semibold tabular-nums text-foreground">{formatCHF(item.value)}</span>
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

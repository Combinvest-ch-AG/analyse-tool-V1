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
  type ValuesByRisk,
  type ValueKey,
} from "@/lib/engine/pension-gap"
import { formatCHF } from "@/lib/format"
import { seriesColor } from "@/lib/data/chart-colors"
import { Upload, RotateCcw } from "lucide-react"
import { CalcActionBar, type CalcContext, type SavedCalculatorPayload } from "@/components/portal/rechner/calc-action-bar"

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
  saved?: SavedCalculatorPayload
  ctx?: CalcContext
}

export function PensionGapCalc({ defaults, saved, ctx }: Props) {
  const stored = saved?.inputs as Record<string, unknown> | undefined
  const [risk, setRisk] = useState<Risk>(RISKS.includes(stored?.risk as Risk) ? stored?.risk as Risk : "iv")
  const [salary, setSalary] = useState(Number(stored?.salary) || defaults?.salary || 0)
  const [targetPct, setTargetPct] = useState(Number(stored?.targetPct) || 90)
  const [age, setAge] = useState(Number(stored?.age) || defaults?.age || 40)
  const [startAge, setStartAge] = useState(Number(stored?.startAge) || 25)
  const [cause, setCause] = useState<Cause>(stored?.cause === "accident" ? "accident" : "illness")
  const [degree, setDegree] = useState(Number(stored?.degree) || 100)
  const [children, setChildren] = useState(Number(stored?.children) || defaults?.children || 0)
  const [averageIncome, setAverageIncome] = useState(Number(stored?.averageIncome) || 0)
  const [contributionGaps, setContributionGaps] = useState(Number(stored?.contributionGaps) || 0)
  const [manual, setManual] = useState<ValuesByRisk>(
    stored?.manual && typeof stored.manual === "object" ? stored.manual as ValuesByRisk : emptyValues(),
  )
  const [period, setPeriod] = useState<"year" | "month">(stored?.period === "month" ? "month" : "year")
  const [pkFileName, setPkFileName] = useState("")

  const inputs = {
    risk,
    salary,
    targetPct,
    cause,
    degree,
    averageIncome,
    contributionGaps,
    children,
    age,
    startAge,
  }

  const resolved = useMemo(() => resolveValues(inputs, manual), [
    risk, salary, targetPct, cause, degree, averageIncome, contributionGaps, children, age, startAge, manual,
  ])
  const gap = useMemo(() => computeGap(inputs, resolved.values), [inputs, resolved.values])

  // Effektiv verwendetes Ø-Einkommen für die AHV (leer = Jahreslohn).
  const usedIncome = averageIncome > 0 ? averageIncome : salary

  function setValue(key: ValueKey, value: number) {
    setManual((prev) => ({ ...prev, [risk]: { ...prev[risk], [key]: value } }))
  }

  // Override zurücknehmen: Schlüssel aus manual entfernen → Feld folgt wieder dem Auto-Wert.
  function resetValue(key: ValueKey) {
    setManual((prev) => {
      const next = { ...prev[risk] }
      delete next[key]
      return { ...prev, [risk]: next }
    })
  }

  const coverPct = Math.round(gap.cover)
  const hasGap = gap.gap > 0
  const gapPct = gap.target > 0 ? Math.min(100, Math.round((gap.gap / gap.target) * 100)) : 0
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
        inputs: {
          risk,
          salary,
          targetPct,
          age,
          startAge,
          cause,
          degree,
          children,
          averageIncome,
          contributionGaps,
          manual,
          period,
        },
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
        setSalary(defaults?.salary ?? 0)
        setTargetPct(90)
        setAge(defaults?.age ?? 40)
        setStartAge(25)
        setCause("illness")
        setDegree(100)
        setChildren(defaults?.children ?? 0)
        setAverageIncome(0)
        setContributionGaps(0)
        setManual(emptyValues())
        setPeriod("year")
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
            <div>
              <MoneyInput label="Ø Jahreseinkommen (AHV-Basis)" value={averageIncome} onChange={setAverageIncome} />
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                Grundlage der AHV-Renten. Leer = Jahreslohn. Verwendet: {formatCHF(usedIncome)}.
              </p>
            </div>
            <NumberInput
              label="AHV-Beitragslücken (Jahre)"
              value={contributionGaps}
              onChange={setContributionGaps}
              min={0}
              max={43}
            />
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

        {/* Automatisch berechnete Grundlagen */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeading n={3} title="Automatisch berechnete Grundlagen" />
          <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
            AHV und BVG-Minimum werden laufend aus Einkommen und Grunddaten berechnet. Jeder Wert lässt sich unten
            jederzeit überschreiben – das Rücksetz-Symbol stellt den automatischen Wert wieder her.
          </p>

          {/* PK-Ausweis: nur als Erfassungshilfe – die BVG-Felder unten sind ohnehin editierbar. */}
          <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-background px-4 py-3 transition-colors hover:border-primary/50">
            <span className="flex items-center gap-2.5">
              <Upload className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold text-foreground">
                {pkFileName ? pkFileName : "PK-Ausweis erfassen"}
              </span>
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {pkFileName ? "Werte unten übertragen" : "PDF/Bild wählen"}
            </span>
            <input
              type="file"
              accept="application/pdf,image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                setPkFileName(f.name)
              }}
            />
          </label>
          <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
            Mit Vorsorgeausweis die Renten unten direkt eintragen. Ohne Ausweis rechnen wir mit dem BVG-Minimum.
          </p>

          {(resolved.ahvCalc || resolved.bvgEstimate) && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {resolved.ahvCalc?.possible && (
                <div className="rounded-xl border border-success/20 bg-success/5 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-success">AHV automatisch</p>
                  <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
                    {formatCHF(resolved.auto[risk].ahv || 0)} / Jahr
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Skala {resolved.ahvCalc.scale}, Einkommen {formatCHF(resolved.ahvCalc.income)}
                  </p>
                </div>
              )}
              {resolved.bvgEstimate && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-primary">BVG-Minimum automatisch</p>
                  <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
                    Versicherter Lohn {formatCHF(resolved.bvgEstimate.coordinated)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Kann mit dem PK-Ausweis präzisiert werden.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Leistungen – automatisch berechnet, jederzeit überschreibbar */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <SectionHeading n={4} title={`${RISK_HEADINGS[risk]} (Jahresbeträge)`} />
          <div className="mt-4 flex flex-col gap-3">
            {CONFIGS[risk]
              .filter(([key]) => !(risk === "iv" && key === "uvg" && cause !== "accident"))
              .map(([key, name]) => {
                const isAuto = !!resolved.autoKeys[risk][key]
                const overridden = manual[risk][key] !== undefined
                const value = resolved.values[risk][key] || 0
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: COLORS[key] }}
                      aria-hidden="true"
                    />
                    <label className="flex-1 text-sm text-foreground">
                      {name}
                      {isAuto && (
                        <span
                          className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            overridden ? "bg-primary/10 text-primary" : "bg-success/10 text-success"
                          }`}
                        >
                          {overridden ? "Überschrieben" : "Auto"}
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={value || ""}
                      onChange={(e) => setValue(key, Number(e.target.value) || 0)}
                      className="w-32 rounded-md border border-border bg-background px-3 py-1.5 text-right text-sm tabular-nums text-foreground focus:border-primary focus:outline-none"
                      placeholder="0"
                    />
                    {isAuto && overridden ? (
                      <button
                        type="button"
                        onClick={() => resetValue(key)}
                        title="Automatischen Wert wiederherstellen"
                        aria-label={`${name}: automatisch berechneten Wert wiederherstellen`}
                        className="shrink-0 rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    ) : (
                      <span className="w-7 shrink-0" aria-hidden="true" />
                    )}
                  </div>
                )
              })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Automatisch aus Einkommen und Grunddaten berechnet. Tippen Sie einen Betrag ein, um ihn zu überschreiben.
          </p>
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
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Zielbedarf</p>
              <p className="mt-1 text-base font-bold tabular-nums text-foreground">{formatCHF(per(gap.target))}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Gesamtleistung</p>
              <p className="mt-1 text-base font-bold tabular-nums text-foreground">{formatCHF(per(gap.total))}</p>
            </div>
            <div className={`rounded-xl border-2 p-3 ${hasGap ? "border-destructive/60 bg-destructive/10" : "border-success/40 bg-success/5"}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Vorsorgelücke</p>
              <p className={`mt-1 text-xl font-black tabular-nums ${hasGap ? "text-destructive" : "text-success"}`}>
                {formatCHF(per(gap.gap))}
              </p>
            </div>
          </div>

          {/* Stacked bar vs target */}
          <div className="mt-5 rounded-2xl border border-border bg-background p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Ihre Leistungen im Verhältnis zum Ziel</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Jeder Farbabschnitt zeigt, woher Ihr abgesichertes Einkommen stammt.
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${hasGap ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
                {Math.min(100, Math.round((gap.total / Math.max(1, gap.target)) * 100))} % gedeckt
              </span>
            </div>

            <div className="relative mt-5 h-11 w-full overflow-hidden rounded-full bg-destructive/10">
              <div className="flex h-full w-full">
                {barSegments.map((seg) => (
                  <div
                    key={seg.key}
                    style={{ width: `${(seg.value / scaleMax) * 100}%`, backgroundColor: COLORS[seg.key] }}
                    title={`${seg.name}: ${formatCHF(per(seg.value))} ${perSuffix}`}
                    className="h-full border-r border-white/40 last:border-r-0"
                  />
                ))}
                {hasGap && gap.target >= gap.total ? (
                  <div
                    className="flex h-full items-center justify-center border-l-2 border-white/80"
                    style={{
                      width: `${(gap.gap / scaleMax) * 100}%`,
                      backgroundColor: seriesColor.red,
                    }}
                    title={`Vorsorgelücke: ${formatCHF(per(gap.gap))} ${perSuffix}`}
                    aria-label={`Vorsorgelücke ${gapPct} Prozent: ${formatCHF(per(gap.gap))} ${perSuffix}`}
                  >
                    {gapPct >= 16 ? (
                      <span className="px-2 text-[11px] font-extrabold text-white">
                        Lücke {gapPct} %
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {/* target marker */}
              <div
                className="absolute inset-y-0 w-0.5 bg-foreground shadow-[0_0_0_2px_rgba(255,255,255,0.7)]"
                style={{ left: `${(gap.target / scaleMax) * 100}%` }}
                aria-hidden="true"
              />
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Vorhanden: <b className="text-foreground">{formatCHF(per(gap.total))}</b>
              </span>
              <span>
                Ziel: <b className="text-foreground">{formatCHF(per(gap.target))}</b>
              </span>
            </div>
            {hasGap ? (
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-destructive">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: seriesColor.red }} aria-hidden="true" />
                Rot markiert: Vorsorgelücke von {formatCHF(per(gap.gap))} {perSuffix}
              </div>
            ) : null}

            {/* Item legend */}
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {gap.items.map((item) => (
                <li key={item.key} className="flex items-center justify-between rounded-xl bg-muted/45 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[item.key] }}
                      aria-hidden="true"
                    />
                    {item.name}
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">{formatCHF(per(item.value))}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Gap context line */}
          {hasGap ? (
            <div className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-destructive">Fehlende Absicherung</p>
              <p className="mt-1 text-base font-black tabular-nums text-destructive">
                {period === "month"
                  ? `${formatCHF(gap.gap)} pro Jahr`
                  : `${formatCHF(Math.round(gap.gap / 12))} pro Monat`}
              </p>
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-success/5 px-4 py-3 text-sm font-semibold text-success">
              Keine Deckungslücke – die Leistungen erreichen den Zielbedarf.
            </p>
          )}

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



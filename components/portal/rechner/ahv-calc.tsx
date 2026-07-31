"use client"

import { useMemo, useState } from "react"
import { TrendingUp } from "lucide-react"
import { formatCHF } from "@/lib/format"
import { calculateAhvRetirement } from "@/lib/engine/ahv-retirement"
import { CalcActionBar, type CalcContext } from "@/components/portal/rechner/calc-action-bar"

const LOW = 15120

export function AhvCalc({
  defaults,
  ctx,
}: {
  defaults?: { income?: number; years?: number; need?: number }
  ctx?: CalcContext
}) {
  const [income, setIncome] = useState(defaults?.income ?? 0)
  const [years, setYears] = useState(defaults?.years ?? 44)
  const [need, setNeed] = useState(defaults?.need ?? 6000)

  const result = useMemo(
    () =>
      calculateAhvRetirement({
        averageIncome: income,
        contributionYears: years,
        desiredMonthlyIncome: need,
      }),
    [income, years, need],
  )

  return (
    <>
      <CalcActionBar
        ctx={ctx ?? {}}
        calcKey="ahv-rente"
        buildPayload={() => ({
          calculator: "ahv-rente",
          inputs: {
            jahreseinkommen: income,
            beitragsjahre: `${years}/44`,
            wunscheinkommen: need,
          },
          results: [
            `AHV-Rente ${formatCHF(result.ordinaryMonthly)}/Monat`,
            `Jahresrente inkl. 13. AHV ${formatCHF(result.annualIncluding13th)}`,
            `Deckung ${Math.round(result.cover)} %`,
            `Vorsorgelücke ${formatCHF(result.gapMonthly)}/Monat`,
          ],
        })}
        onReset={() => {
          setIncome(defaults?.income ?? 0)
          setYears(44)
          setNeed(6000)
        }}
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* Inputs */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <Slider
            label="Durchschnittliches Jahreseinkommen"
            value={formatCHF(income)}
            min={LOW}
            max={120000}
            step={840}
            current={income}
            onChange={setIncome}
            hint="Massgebender Durchschnitt inkl. möglicher Erziehungs-/Betreuungsgutschriften."
          />
          <Slider
            label="Beitragsjahre / Rentenskala"
            value={`${years}/44`}
            min={1}
            max={44}
            step={1}
            current={years}
            onChange={setYears}
            hint="44 Jahre entsprechen einer Vollrente (Skala 44)."
          />
          <Slider
            label="Gewünschtes Einkommen im Ruhestand / Monat"
            value={formatCHF(need)}
            min={2000}
            max={12000}
            step={100}
            current={need}
            onChange={setNeed}
          />
        </div>

        {/* Results */}
        <section aria-live="polite" className="rounded-2xl border border-border bg-card p-6">
          <div className="rounded-2xl bg-primary p-6 text-primary-foreground">
            <div className="flex items-center gap-2 text-[13px] opacity-80">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              Geschätzte AHV-Altersrente
            </div>
            <strong className="mt-1 block text-4xl font-black tabular-nums">
              {formatCHF(result.ordinaryMonthly)} <span className="text-lg font-semibold opacity-80">/ Monat</span>
            </strong>
            <span className="mt-1 block text-sm opacity-80">
              Rentenskala {years} · {years === 44 ? "Vollrente" : "Teilrente"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Metric label="Pro Jahr inkl. 13. AHV" value={formatCHF(result.annualIncluding13th)} />
            <Metric label="Monatswert für Jahresplanung" value={formatCHF(result.monthlyEquivalent)} />
            <Metric
              label="Vorsorgelücke / Monat"
              value={formatCHF(result.gapMonthly)}
              tone={result.gapMonthly > 0 ? "crit" : "good"}
            />
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-background p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-foreground">AHV und gewünschtes Einkommen</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Monatliche Gegenüberstellung – Pensionskasse und Säule 3a sind noch nicht enthalten.
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold text-primary">
                {Math.round(result.cover)} % gedeckt
              </span>
            </div>

            <div className="mt-5">
              <div className="relative flex h-7 overflow-hidden rounded-full bg-destructive/10">
                <div
                  className="h-full bg-primary transition-[width] duration-500"
                  style={{ width: `${result.cover}%` }}
                  title={`AHV-Jahreswert auf den Monat umgerechnet: ${formatCHF(result.monthlyEquivalent)}`}
                />
                {result.gapMonthly > 0 ? (
                  <div
                    className="h-full bg-destructive/70"
                    style={{ width: `${100 - result.cover}%` }}
                    title={`Noch nicht gedeckt: ${formatCHF(result.gapMonthly)} pro Monat`}
                  />
                ) : null}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2.5">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <i className="h-3 w-3 rounded-full bg-primary" /> AHV-Rente
                  </span>
                  <strong className="text-sm tabular-nums text-foreground">{formatCHF(result.monthlyEquivalent)}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <i className="h-3 w-3 rounded-full bg-destructive" /> Vorsorgelücke
                  </span>
                  <strong className="text-base font-black tabular-nums text-destructive">{formatCHF(result.gapMonthly)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-4 text-[12.5px] text-muted-foreground">
            <b className="text-foreground">Berechnung 2026:</b> Skala 44 und die 13. Altersrente sind berücksichtigt.
            Verbindlich bleiben IK-Auszug und Rentenvorausberechnung Ihrer Ausgleichskasse. Ehepaarplafonierung,
            Splitting, Gutschriften, Vorbezug und Aufschub benötigen eine individuelle Prüfung.
          </div>
        </section>
      </div>
    </>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  current,
  onChange,
  hint,
}: {
  label: string
  value: string
  min: number
  max: number
  step: number
  current: number
  onChange: (v: number) => void
  hint?: string
}) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-center justify-between gap-3">
        <label className="text-[13px] font-semibold text-foreground">{label}</label>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={current}
          onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
          className="w-28 rounded-lg border border-border bg-background px-2 py-1 text-right text-sm font-bold tabular-nums text-primary outline-none focus:border-primary"
          aria-label={`${label} direkt eingeben`}
        />
      </div>
      <p className="mt-1 text-right text-[11px] font-semibold text-muted-foreground">{value}</p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--primary)]"
      />
      {hint ? <p className="mt-1.5 text-[11.5px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" | "crit" }) {
  const color = tone === "crit" ? "text-destructive" : tone === "good" ? "text-success" : "text-foreground"
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

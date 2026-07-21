"use client"

import { useMemo, useState } from "react"
import { affordability, maxAffordable, RULES } from "@/lib/engine/affordability"
import { formatCHF } from "@/lib/format"

type Field = "wert" | "ek" | "inc"

const SLIDERS: Record<Field, { min: number; max: number; step: number }> = {
  wert: { min: 300000, max: 3000000, step: 25000 },
  ek: { min: 0, max: 1500000, step: 10000 },
  inc: { min: 60000, max: 400000, step: 5000 },
}

export function AffordabilityCalc({ defaults }: { defaults?: { income?: number } }) {
  const [wert, setWert] = useState(1000000)
  const [ek, setEk] = useState(200000)
  const [inc, setInc] = useState(defaults?.income && defaults.income > 0 ? defaults.income : 150000)

  const r = useMemo(() => affordability({ wert, eigenkapital: ek, bruttoeinkommenJahr: inc }), [wert, ek, inc])
  const maxPrice = useMemo(() => maxAffordable(inc, ek), [inc, ek])

  const ekPct = wert > 0 ? Math.round((ek / wert) * 100) : 0
  const quoteText = Number.isFinite(r.quote) ? r.quote.toFixed(1) : "—"
  const scaleMax = 50

  const reasons: string[] = []
  if (r.ekQuote < RULES.minEigenkapital) reasons.push("Eigenkapital unter 20 %")
  if (r.belehnung > RULES.maxBelehnung) reasons.push("Belehnung über 80 %")
  if (r.quote > RULES.tragbarkeitsLimit) reasons.push("Wohnkosten über einem Drittel des Einkommens")

  const parts: { label: string; value: number; color: string }[] = [
    { label: "Zinslast (kalk. 5 %)", value: r.zinslast, color: "var(--color-foreground)" },
    { label: "Amortisation", value: r.amortisation, color: "#8595ad" },
    { label: "Nebenkosten (1 %)", value: r.nebenkosten, color: "#c7b489" },
  ]
  const totalLast = r.gesamtlast || 1

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
      {/* Inputs */}
      <section aria-label="Eingaben" className="rounded-2xl border border-border bg-card p-5">
        <p className="mb-4 border-b border-border pb-2.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
          Ihre Angaben
        </p>

        <SliderField
          label="Kaufpreis"
          value={wert}
          field="wert"
          onChange={setWert}
        />
        <SliderField
          label="Eigenkapital"
          value={ek}
          field="ek"
          onChange={setEk}
          sub={`${ekPct} % des Kaufpreises${ek / wert < 0.2 ? " — unter 20 %" : ""}`}
        />
        <SliderField
          label="Bruttoeinkommen / Jahr"
          value={inc}
          field="inc"
          onChange={setInc}
          last
        />
      </section>

      {/* Result */}
      <section aria-live="polite" className="rounded-2xl border border-border bg-card p-6">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
          Tragbarkeit (Wohnkosten / Einkommen)
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-4">
          <span className={`text-5xl font-black tracking-tight ${r.tragbar ? "text-success" : "text-destructive"}`}>
            {quoteText} %
          </span>
          <span
            className={`rounded-full px-3 py-1.5 text-[13px] font-extrabold ${
              r.tragbar ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            }`}
          >
            {r.tragbar ? "✓ Tragbar" : "Nicht tragbar"}
          </span>
        </div>
        <p className="mt-2 max-w-[58ch] leading-relaxed text-muted-foreground">
          {r.tragbar ? (
            <>
              Die kalkulatorischen Wohnkosten von <b className="text-foreground">{formatCHF(r.gesamtlast)}</b> pro Jahr
              liegen bei <b className="text-foreground">{quoteText} %</b> Ihres Bruttoeinkommens — innerhalb des Limits
              von einem Drittel.
            </>
          ) : (
            <>Aktuell nicht tragbar: {reasons.join(", ")}. Zielgrösse: Wohnkosten ≤ 33.3 % des Einkommens, Eigenkapital ≥ 20 %.</>
          )}
        </p>

        {/* Meter */}
        <div className="mt-7">
          <div className="mb-2.5 flex justify-between text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
            <span>0 %</span>
            <span>Wohnkosten-Quote</span>
            <span>50 %</span>
          </div>
          <div className="relative h-3 overflow-visible rounded-full bg-muted">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${
                r.tragbar ? "bg-success" : "bg-destructive"
              }`}
              style={{ width: `${Math.min(100, (Number.isFinite(r.quote) ? r.quote : 0) / scaleMax * 100)}%` }}
            />
            <div
              className="absolute -top-1.5 -bottom-1.5 w-px bg-[#b8923b]"
              style={{ left: `${(RULES.tragbarkeitsLimit / scaleMax) * 100}%` }}
            >
              <b className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-extrabold text-[#b8923b]">
                33.3 %
              </b>
            </div>
          </div>
        </div>

        {/* Facts */}
        <div className="mt-9 flex flex-wrap gap-x-11 gap-y-5">
          <Fact label="Max. tragbarer Kaufpreis" value={formatCHF(maxPrice)} sub="bei Ihrem Einkommen" />
          <Fact label="Belehnung" value={`${r.belehnung.toFixed(0)} %`} sub="max. 80 %" />
          <Fact label="Wohnkosten / Jahr" value={formatCHF(r.gesamtlast)} sub="kalkulatorisch" />
          <Fact label="Wohnkosten / Monat" value={formatCHF(r.gesamtlast / 12)} sub="kalkulatorisch" />
        </div>

        {/* Breakdown */}
        <div className="mt-9">
          <h3 className="mb-3.5 text-[12px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
            Zusammensetzung der kalkulatorischen Wohnkosten
          </h3>
          <div className="flex h-4 gap-0.5 overflow-hidden rounded-lg">
            {parts.map((p) => (
              <span
                key={p.label}
                className="h-full"
                style={{ width: `${(p.value / totalLast) * 100}%`, background: p.color }}
                title={`${p.label}: ${formatCHF(p.value)} pro Jahr`}
              />
            ))}
          </div>
          <div className="mt-3.5 flex flex-wrap gap-x-6 gap-y-2">
            {parts.map((p) => (
              <div key={p.label} className="text-[13px]">
                <i
                  className="mr-2 inline-block h-2.5 w-2.5 rounded-[3px] align-middle"
                  style={{ background: p.color }}
                />
                <span className="font-extrabold text-foreground">{formatCHF(p.value)}</span>{" "}
                <span className="text-muted-foreground">{p.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-6 max-w-[74ch] border-t border-border pt-4 text-[12.5px] text-muted-foreground">
          Grundlage: 5 % kalkulatorischer Zins, 1 % Nebenkosten und Amortisation der zweiten Hypothek über 15 Jahre.
          Verbindlich sind die Konditionen des finanzierenden Instituts.
        </p>
      </section>
    </div>
  )
}

function SliderField({
  label,
  value,
  field,
  onChange,
  sub,
  last,
}: {
  label: string
  value: number
  field: Field
  onChange: (v: number) => void
  sub?: string
  last?: boolean
}) {
  const cfg = SLIDERS[field]
  return (
    <div className={last ? "" : "mb-6"}>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[13.5px] font-semibold text-foreground">{label}</span>
        <label className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-2 py-1">
          <span className="text-[11px] font-bold text-muted-foreground">CHF</span>
          <input
            type="number"
            min={0}
            step={cfg.step}
            value={value}
            onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
            aria-label={`${label} direkt eingeben`}
            className="w-28 bg-transparent text-right text-sm font-extrabold tabular-nums text-foreground outline-none"
          />
        </label>
      </div>
      <input
        type="range"
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        value={Math.max(cfg.min, Math.min(cfg.max, value))}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full accent-primary"
      />
      {sub ? <div className="mt-1.5 text-[11.5px] text-muted-foreground">{sub}</div> : null}
    </div>
  )
}

function Fact({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-black tabular-nums tracking-tight text-foreground">{value}</div>
      <div className="mt-0.5 text-[12px] text-muted-foreground">{sub}</div>
    </div>
  )
}

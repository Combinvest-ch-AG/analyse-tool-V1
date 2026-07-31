"use client"

import { useId, useMemo, useState } from "react"
import {
  affordability,
  effectiveHousingCost,
  maxAffordable,
  RULES,
} from "@/lib/engine/affordability"
import { formatCHF } from "@/lib/format"
import { CalcActionBar, type CalcContext } from "@/components/portal/rechner/calc-action-bar"

type Field = "wert" | "ek" | "inc"
type View = "bank" | "actual"

type HouseSegment = {
  label: string
  value: number
  color: string
}

const SLIDERS: Record<Field, { min: number; max: number; step: number }> = {
  wert: { min: 300000, max: 3000000, step: 25000 },
  ek: { min: 0, max: 1500000, step: 10000 },
  inc: { min: 0, max: 500000, step: 5000 },
}

export function AffordabilityCalc({ defaults, ctx }: { defaults?: { income?: number }; ctx?: CalcContext }) {
  const defaultInc = Math.max(0, defaults?.income ?? 0)
  const [view, setView] = useState<View>("bank")
  const [wert, setWert] = useState(1000000)
  const [ek, setEk] = useState(200000)
  const [inc, setInc] = useState(defaultInc)
  const [mortgageRate, setMortgageRate] = useState(1.75)
  const [maintenance, setMaintenance] = useState(6000)
  const [utilities, setUtilities] = useState(4000)
  const [actualAmortization, setActualAmortization] = useState(9000)
  const [rentMonthly, setRentMonthly] = useState(2500)

  const r = useMemo(() => affordability({ wert, eigenkapital: ek, bruttoeinkommenJahr: inc }), [wert, ek, inc])
  const maxPrice = useMemo(() => maxAffordable(inc, ek), [inc, ek])
  const actual = useMemo(() => effectiveHousingCost({
    mortgage: r.hypothek,
    mortgageRatePct: mortgageRate,
    maintenanceAnnual: maintenance,
    utilitiesAnnual: utilities,
    amortizationAnnual: actualAmortization,
    rentMonthly,
  }), [r.hypothek, mortgageRate, maintenance, utilities, actualAmortization, rentMonthly])

  const ekPct = wert > 0 ? Math.round((ek / wert) * 100) : 0
  const quoteText = Number.isFinite(r.quote) ? r.quote.toFixed(1) : "—"
  const reasons: string[] = []
  if (r.ekQuote < RULES.minEigenkapital) reasons.push("Eigenmittel unter 20 %")
  if (r.belehnung > RULES.maxBelehnung) reasons.push("Belehnung über 80 %")
  if (r.quote > RULES.tragbarkeitsLimit) reasons.push("Belastung über einem Drittel des Einkommens")

  const financingSegments: HouseSegment[] = [
    { label: "Eigenmittel", value: Math.min(Math.max(0, ek), wert), color: "#24a66f" },
    { label: "1. Hypothek", value: r.ersteHyp, color: "#3978f6" },
    { label: "2. Hypothek", value: r.zweiteHyp, color: "#f2a12c" },
  ]
  const actualSegments: HouseSegment[] = [
    { label: "Hypothekarzins", value: actual.interestAnnual, color: "#3978f6" },
    { label: "Unterhalt / Rückstellungen", value: maintenance, color: "#f2a12c" },
    { label: "Nebenkosten", value: utilities, color: "#8a62d3" },
    { label: "Amortisation", value: actualAmortization, color: "#24a66f" },
  ]

  function reset() {
    setView("bank")
    setWert(1000000)
    setEk(200000)
    setInc(defaultInc)
    setMortgageRate(1.75)
    setMaintenance(6000)
    setUtilities(4000)
    setActualAmortization(9000)
    setRentMonthly(2500)
  }

  return (
    <>
      <CalcActionBar
        ctx={ctx ?? {}}
        calcKey="real-estate-affordability"
        buildPayload={() => ({
          calculator: "real-estate-affordability",
          inputs: {
            ansicht: view,
            kaufpreis: wert,
            eigenmittel: ek,
            bruttoeinkommen: inc,
            effektiver_hypothekarzins: mortgageRate,
            unterhalt_jahr: maintenance,
            nebenkosten_jahr: utilities,
            amortisation_jahr: actualAmortization,
            vergleichsmiete_monat: rentMonthly,
          },
          results: [
            `Bank-Tragbarkeit ${quoteText} %`,
            r.tragbar ? "Tragbar" : "Nicht tragbar",
            `Eigenmittel ${formatCHF(ek)}`,
            `1. Hypothek ${formatCHF(r.ersteHyp)}`,
            `2. Hypothek ${formatCHF(r.zweiteHyp)}`,
            `Effektive Eigentümerkosten ${formatCHF(actual.ownershipCostAnnual / 12)}/Monat`,
            `Liquiditätsabfluss inkl. Amortisation ${formatCHF(actual.cashOutflowAnnual / 12)}/Monat`,
            `Vergleichsmiete ${formatCHF(actual.rentAnnual / 12)}/Monat`,
          ],
        })}
        onReset={reset}
      />

      <ViewSwitch value={view} onChange={setView} />

      <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section aria-label="Eingaben" className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-4 border-b border-border pb-2.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
            {view === "bank" ? "Finanzierung" : "Ihre effektiven Werte"}
          </p>

          <SliderField label="Kaufpreis" value={wert} field="wert" onChange={setWert} />
          <SliderField
            label="Eigenmittel"
            value={ek}
            field="ek"
            onChange={setEk}
            sub={`${ekPct} % des Kaufpreises${ekPct < 20 ? " — unter 20 %" : ""}`}
          />
          <SliderField label="Bruttoeinkommen / Jahr" value={inc} field="inc" onChange={setInc} last={view === "bank"} />

          {view === "actual" ? (
            <div className="mt-5 border-t border-border pt-5">
              <PercentField label="Effektiver Hypothekarzins" value={mortgageRate} onChange={setMortgageRate} />
              <MoneyField label="Unterhalt / Rückstellungen pro Jahr" value={maintenance} onChange={setMaintenance} />
              <MoneyField label="Nebenkosten pro Jahr" value={utilities} onChange={setUtilities} />
              <MoneyField
                label="Amortisation pro Jahr"
                value={actualAmortization}
                onChange={setActualAmortization}
                actionLabel="Bankwert übernehmen"
                onAction={() => setActualAmortization(Math.round(r.amortisation))}
              />
              <MoneyField label="Vergleichsmiete pro Monat" value={rentMonthly} onChange={setRentMonthly} last />
            </div>
          ) : null}
        </section>

        <section aria-live="polite" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
            <HouseFill
              title={view === "bank" ? "So ist das Eigenheim finanziert" : "So setzen sich Ihre Zahlungen zusammen"}
              total={view === "bank" ? Math.max(1, wert) : Math.max(1, actual.cashOutflowAnnual)}
              totalLabel={view === "bank" ? "Kaufpreis" : "Cashflow / Jahr"}
              segments={view === "bank" ? financingSegments : actualSegments}
            />

            {view === "bank" ? (
              <BankResult
                result={r}
                quoteText={quoteText}
                reasons={reasons}
                maxPrice={maxPrice}
              />
            ) : (
              <ActualResult result={actual} />
            )}
          </div>

          <p className="mt-6 border-t border-border pt-4 text-[12px] leading-relaxed text-muted-foreground">
            {view === "bank"
              ? "Bankansicht: 5 % kalkulatorischer Zins, 1 % Unterhalt/Nebenkosten und lineare Amortisation der zweiten Hypothek über 15 Jahre. Institute können strengere Vorgaben anwenden."
              : "Effektive Ansicht: Reiner Kosten- und Liquiditätsvergleich ohne Steuern, Wertentwicklung und Opportunitätskosten. Amortisation wird separat ausgewiesen, weil sie Vermögen aufbaut."}
          </p>
        </section>
      </div>
    </>
  )
}

function ViewSwitch({ value, onChange }: { value: View; onChange: (view: View) => void }) {
  const options: { id: View; title: string; text: string }[] = [
    { id: "bank", title: "Bank-Tragbarkeit", text: "Prüft Finanzierung und Einkommen mit konservativen Richtwerten." },
    { id: "actual", title: "Effektive Wohnkosten", text: "Vergleicht Ihre echten Eigentümerkosten direkt mit einer Miete." },
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="tablist" aria-label="Berechnungsansicht wählen">
      {options.map((option) => {
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              active ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <span className={`text-sm font-extrabold ${active ? "text-primary" : "text-foreground"}`}>{option.title}</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{option.text}</span>
          </button>
        )
      })}
    </div>
  )
}

function BankResult({
  result,
  quoteText,
  reasons,
  maxPrice,
}: {
  result: ReturnType<typeof affordability>
  quoteText: string
  reasons: string[]
  maxPrice: number
}) {
  const parts = [
    { label: "Zinslast (5 %)", value: result.zinslast, color: "#3978f6" },
    { label: "Amortisation", value: result.amortisation, color: "#24a66f" },
    { label: "Unterhalt / Nebenkosten", value: result.nebenkosten, color: "#f2a12c" },
  ]
  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">Bank-Tragbarkeit</p>
      <div className="mt-2 flex flex-wrap items-baseline gap-3">
        <span className={`text-5xl font-black tracking-tight ${result.tragbar ? "text-success" : "text-destructive"}`}>
          {quoteText} %
        </span>
        <StatusBadge good={result.tragbar} goodText="Tragbar" badText="Nicht tragbar" />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {result.tragbar
          ? `Die kalkulatorische Belastung liegt innerhalb des Richtwerts von einem Drittel des Bruttoeinkommens.`
          : reasons.join(" · ") || "Bitte Finanzierung und Einkommen prüfen."}
      </p>

      <AffordabilityMeter quote={result.quote} />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Fact label="Max. Kaufpreis" value={formatCHF(maxPrice)} sub="bei diesen Angaben" />
        <Fact label="Hypothek total" value={formatCHF(result.hypothek)} sub={`${result.belehnung.toFixed(0)} % Belehnung`} />
        <Fact label="Belastung / Jahr" value={formatCHF(result.gesamtlast)} sub="kalkulatorisch" />
        <Fact label="Belastung / Monat" value={formatCHF(result.gesamtlast / 12)} sub="kalkulatorisch" />
      </div>

      <Breakdown title="Kalkulatorische Jahresbelastung" items={parts} total={result.gesamtlast} />
    </div>
  )
}

function ActualResult({ result }: { result: ReturnType<typeof effectiveHousingCost> }) {
  const max = Math.max(result.ownershipCostAnnual, result.cashOutflowAnnual, result.rentAnnual, 1)
  const difference = result.costDifferenceAnnual
  const items = [
    { label: "Eigentümerkosten", value: result.ownershipCostAnnual, color: "#3978f6" },
    { label: "Cashflow inkl. Amortisation", value: result.cashOutflowAnnual, color: "#24a66f" },
    { label: "Miete", value: result.rentAnnual, color: "#f2a12c" },
  ]
  return (
    <div>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">Eigentum oder Miete</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Metric label="Eigentümerkosten" value={`${formatCHF(result.ownershipCostAnnual / 12)} / Mt.`} tone="primary" />
        <Metric label="Cashflow inkl. Amortisation" value={`${formatCHF(result.cashOutflowAnnual / 12)} / Mt.`} tone="success" />
        <Metric label="Vergleichsmiete" value={`${formatCHF(result.rentAnnual / 12)} / Mt.`} tone="warning" />
      </div>

      <div className={`mt-4 rounded-xl border px-4 py-3 ${
        difference <= 0 ? "border-success/30 bg-success/5 text-success" : "border-warning/40 bg-warning/5 text-foreground"
      }`}>
        <p className="text-sm font-extrabold">
          Eigentum kostet {formatCHF(Math.abs(difference) / 12)} pro Monat {difference <= 0 ? "weniger" : "mehr"} als die Vergleichsmiete.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Vergleich ohne Amortisation, weil diese Ihr Eigenkapital erhöht.</p>
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-background p-4">
        <h3 className="text-sm font-extrabold text-foreground">Monatlicher Vergleich</h3>
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-muted-foreground">{item.label}</span>
                <span className="font-extrabold tabular-nums text-foreground">{formatCHF(item.value / 12)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Fact label="Hypothekarzins / Jahr" value={formatCHF(result.interestAnnual)} sub="effektive Eingabe" />
        <Fact
          label="Liquiditätsdifferenz / Monat"
          value={formatCHF(Math.abs(result.cashDifferenceAnnual) / 12)}
          sub={result.cashDifferenceAnnual <= 0 ? "Eigentum tiefer" : "Eigentum höher"}
        />
      </div>
    </div>
  )
}

function HouseFill({ title, total, totalLabel, segments }: { title: string; total: number; totalLabel: string; segments: HouseSegment[] }) {
  const id = useId().replace(/:/g, "")
  const usableHeight = 242
  let cursor = 276
  const rendered = segments.filter((segment) => segment.value > 0).map((segment) => {
    const height = Math.max(0, Math.min(usableHeight, (segment.value / total) * usableHeight))
    cursor -= height
    return { ...segment, height, y: cursor }
  })
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <h3 className="text-center text-sm font-extrabold text-foreground">{title}</h3>
      <p className="mt-1 text-center text-xs text-muted-foreground">Die Flächen füllen sich von unten nach oben.</p>
      <svg viewBox="0 0 320 300" className="mx-auto mt-3 h-auto w-full max-w-[280px]" role="img" aria-label={title}>
        <defs>
          <clipPath id={id}>
            <path d="M38 140 160 32 282 140 248 140 248 276 72 276 72 140Z" />
          </clipPath>
        </defs>
        <path d="M38 140 160 32 282 140 248 140 248 276 72 276 72 140Z" fill="#edf2f8" />
        <g clipPath={`url(#${id})`}>
          {rendered.map((segment) => (
            <rect
              key={segment.label}
              x="32"
              y={segment.y}
              width="256"
              height={segment.height}
              fill={segment.color}
              stroke="rgba(255,255,255,.75)"
              strokeWidth="2"
            >
              <title>{`${segment.label}: ${formatCHF(segment.value)}`}</title>
            </rect>
          ))}
        </g>
        <path
          d="M38 140 160 32 282 140 248 140 248 276 72 276 72 140Z"
          fill="none"
          stroke="#0f2444"
          strokeWidth="7"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-2 rounded-xl bg-card px-3 py-2 text-center">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{totalLabel}</span>
        <p className="text-lg font-black tabular-nums text-foreground">{formatCHF(total)}</p>
      </div>
      <div className="mt-3 space-y-2">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <i className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: segment.color }} />
              {segment.label}
            </span>
            <span className="font-extrabold tabular-nums text-foreground">{formatCHF(segment.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AffordabilityMeter({ quote }: { quote: number }) {
  const safe = Number.isFinite(quote) ? quote : 0
  return (
    <div className="mt-5 rounded-2xl border border-border bg-background p-4">
      <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        <span>0 %</span><span>Richtwert 33.3 %</span><span>50 %</span>
      </div>
      <div className="relative h-4 rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 rounded-l-full bg-success/70" style={{ width: "66.6%" }} />
        <div className="absolute inset-y-0 bg-[#f4b64f]" style={{ left: "66.6%", width: "13.4%" }} />
        <div className="absolute inset-y-0 right-0 rounded-r-full bg-destructive/70" style={{ width: "20%" }} />
        <span
          className="absolute -top-2 h-8 w-1 -translate-x-1/2 rounded-full bg-foreground shadow-[0_0_0_3px_var(--card)]"
          style={{ left: `${Math.min(100, (safe / 50) * 100)}%` }}
        />
      </div>
    </div>
  )
}

function Breakdown({ title, items, total }: { title: string; items: HouseSegment[]; total: number }) {
  return (
    <div className="mt-5 rounded-2xl border border-border bg-background p-4">
      <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted-foreground">{title}</h3>
      <div className="mt-3 flex h-5 gap-0.5 overflow-hidden rounded-full bg-muted">
        {items.map((item) => (
          <span
            key={item.label}
            style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%`, backgroundColor: item.color }}
            title={`${item.label}: ${formatCHF(item.value)}`}
          />
        ))}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">{item.label}</p>
            <p className="mt-0.5 text-sm font-extrabold tabular-nums text-foreground">{formatCHF(item.value)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SliderField({ label, value, field, onChange, sub, last }: {
  label: string
  value: number
  field: Field
  onChange: (value: number) => void
  sub?: string
  last?: boolean
}) {
  const cfg = SLIDERS[field]
  return (
    <div className={last ? "" : "mb-6"}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[13.5px] font-semibold text-foreground">{label}</span>
        <CurrencyInput label={label} value={value} step={cfg.step} onChange={onChange} compact />
      </div>
      <input
        type="range"
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        value={Math.max(cfg.min, Math.min(cfg.max, value))}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className="w-full accent-primary"
      />
      {sub ? <div className="mt-1.5 text-[11.5px] text-muted-foreground">{sub}</div> : null}
    </div>
  )
}

function PercentField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-foreground">{label}</span>
        <label className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-2 py-1">
          <input
            type="number"
            min={0}
            max={15}
            step={0.05}
            value={value}
            onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
            className="w-16 bg-transparent text-right text-sm font-extrabold tabular-nums outline-none"
          />
          <span className="text-xs font-bold text-muted-foreground">%</span>
        </label>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={0.05}
        value={Math.min(10, value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-primary"
      />
    </div>
  )
}

function MoneyField({ label, value, onChange, actionLabel, onAction, last }: {
  label: string
  value: number
  onChange: (value: number) => void
  actionLabel?: string
  onAction?: () => void
  last?: boolean
}) {
  return (
    <div className={last ? "" : "mb-4"}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="text-[12.5px] font-semibold text-foreground">{label}</label>
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction} className="text-[10px] font-bold text-primary hover:underline">{actionLabel}</button>
        ) : null}
      </div>
      <CurrencyInput label={label} value={value} step={100} onChange={onChange} />
    </div>
  )
}

function CurrencyInput({ label, value, step, onChange, compact }: {
  label: string
  value: number
  step: number
  onChange: (value: number) => void
  compact?: boolean
}) {
  return (
    <label className={`flex items-center gap-1 rounded-lg border border-border bg-secondary px-2 ${compact ? "py-1" : "py-2.5"}`}>
      <span className="text-[11px] font-bold text-muted-foreground">CHF</span>
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
        aria-label={`${label} direkt eingeben`}
        className={`${compact ? "w-24" : "w-full"} bg-transparent text-right text-sm font-extrabold tabular-nums text-foreground outline-none`}
      />
    </label>
  )
}

function Fact({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-muted/35 p-3">
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-black tabular-nums tracking-tight text-foreground">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "primary" | "success" | "warning" }) {
  const classes = {
    primary: "border-primary/25 bg-primary/5 text-primary",
    success: "border-success/25 bg-success/5 text-success",
    warning: "border-[#f2a12c]/35 bg-[#f2a12c]/10 text-foreground",
  }
  return (
    <div className={`rounded-xl border p-3 ${classes[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-base font-black tabular-nums">{value}</p>
    </div>
  )
}

function StatusBadge({ good, goodText, badText }: { good: boolean; goodText: string; badText: string }) {
  return (
    <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${
      good ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
    }`}>
      {good ? `✓ ${goodText}` : badText}
    </span>
  )
}

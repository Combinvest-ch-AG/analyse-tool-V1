"use client"

import { useId, useMemo, useState, type ReactNode } from "react"
import { Building2, Home, Landmark, ReceiptText, Scale } from "lucide-react"
import {
  affordability,
  effectiveHousingCost,
  maxAffordable,
  RULES,
} from "@/lib/engine/affordability"
import { formatCHF } from "@/lib/format"
import { seriesColor, gaugeArt } from "@/lib/data/chart-colors"
import { CalcActionBar, type CalcContext, type SavedCalculatorPayload } from "@/components/portal/rechner/calc-action-bar"

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

export function AffordabilityCalc({ defaults, saved, ctx }: { defaults?: { income?: number }; saved?: SavedCalculatorPayload; ctx?: CalcContext }) {
  const savedInputs = saved?.inputs as Record<string, unknown> | undefined
  const defaultInc = Math.max(0, defaults?.income ?? 0)
  const [view, setView] = useState<View>(savedInputs?.ansicht === "actual" ? "actual" : "bank")
  const [wert, setWert] = useState(Number(savedInputs?.kaufpreis) || 1000000)
  const [ek, setEk] = useState(Number(savedInputs?.eigenmittel) || 200000)
  const [inc, setInc] = useState(Number(savedInputs?.bruttoeinkommen) || defaultInc)
  const [mortgageRate, setMortgageRate] = useState(Number(savedInputs?.effektiver_hypothekarzins) || 1.75)
  const [maintenance, setMaintenance] = useState(Number(savedInputs?.unterhalt_jahr) || 6000)
  const [utilities, setUtilities] = useState(Number(savedInputs?.nebenkosten_jahr) || 4000)
  const [actualAmortization, setActualAmortization] = useState(Number(savedInputs?.amortisation_jahr) || 9000)
  const [rentMonthly, setRentMonthly] = useState(Number(savedInputs?.vergleichsmiete_monat) || 2500)

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
    { label: "Eigenmittel", value: Math.min(Math.max(0, ek), wert), color: seriesColor.green },
    { label: "1. Hypothek", value: r.ersteHyp, color: seriesColor.blue },
    { label: "2. Hypothek", value: r.zweiteHyp, color: seriesColor.amber },
  ]
  const actualSegments: HouseSegment[] = [
    { label: "Hypothekarzins", value: actual.interestAnnual, color: seriesColor.blue },
    { label: "Unterhalt / Rückstellungen", value: maintenance, color: seriesColor.amber },
    { label: "Nebenkosten", value: utilities, color: seriesColor.purple },
    { label: "Amortisation", value: actualAmortization, color: seriesColor.green },
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

      <div className="mt-5 grid grid-cols-1 items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section aria-label="Eingaben" className="space-y-4">
          <InputPanel
            number="1"
            title="Objekt & Finanzierung"
            description={view === "bank" ? "Grundlage für die Bankprüfung" : "Kaufpreis und eingesetzte Eigenmittel"}
            icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
          >
            <SliderField label="Kaufpreis" value={wert} field="wert" onChange={setWert} />
            <SliderField
              label="Eigenmittel"
              value={ek}
              field="ek"
              onChange={setEk}
              sub={`${ekPct} % des Kaufpreises${ekPct < 20 ? " · unter dem Richtwert von 20 %" : " · Richtwert erreicht"}`}
              last={view === "actual"}
            />
            {view === "bank" ? (
              <SliderField label="Bruttoeinkommen / Jahr" value={inc} field="inc" onChange={setInc} last />
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
                <InputSummary label="Hypothek total" value={formatCHF(r.hypothek)} />
                <InputSummary label="Belehnung" value={`${r.belehnung.toFixed(0)} %`} />
              </div>
            )}
          </InputPanel>

          {view === "actual" ? (
            <InputPanel
              number="2"
              title="Effektive Wohnkosten"
              description="Persönliche Werte statt Bankannahmen"
              icon={<ReceiptText className="h-4 w-4" aria-hidden="true" />}
            >
              <PercentField
                label="Effektiver Hypothekarzins"
                value={mortgageRate}
                onChange={setMortgageRate}
                hint={`${formatCHF(actual.interestAnnual)} pro Jahr`}
              />
              <MoneyField
                label="Unterhalt & Rückstellungen"
                value={maintenance}
                onChange={setMaintenance}
                period="pro Jahr"
                hint={`${formatCHF(maintenance / 12)} pro Monat`}
              />
              <MoneyField
                label="Nebenkosten Eigentum"
                value={utilities}
                onChange={setUtilities}
                period="pro Jahr"
                hint={`${formatCHF(utilities / 12)} pro Monat`}
              />
              <MoneyField
                label="Amortisation"
                value={actualAmortization}
                onChange={setActualAmortization}
                period="pro Jahr"
                hint={`${formatCHF(actualAmortization / 12)} pro Monat`}
                actionLabel="Bankwert übernehmen"
                onAction={() => setActualAmortization(Math.round(r.amortisation))}
              />
              <MoneyField
                label="Vergleichsmiete inkl. Nebenkosten"
                value={rentMonthly}
                onChange={setRentMonthly}
                period="pro Monat"
                last
              />
            </InputPanel>
          ) : null}
        </section>

        <section aria-live="polite" className="@container min-w-0 overflow-hidden rounded-3xl border border-border bg-card shadow-[0_18px_50px_rgba(24,49,92,0.06)]">
          <div className="border-b border-border bg-gradient-to-r from-surface-subtle to-white px-5 py-4 sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary">Beratungsansicht</p>
                <h2 className="mt-1 text-lg font-black tracking-tight text-foreground sm:text-xl">
                  {view === "bank" ? "Finanzierung auf einen Blick" : "Eigentum und Miete im direkten Vergleich"}
                </h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-bold text-muted-foreground shadow-sm">
                {view === "bank" ? <Landmark className="h-3.5 w-3.5 text-primary" /> : <Scale className="h-3.5 w-3.5 text-primary" />}
                {view === "bank" ? "Bank-Richtwerte" : "Ihre effektiven Werte"}
              </span>
            </div>
          </div>

          <div className="grid min-w-0 gap-5 p-5 sm:p-7 @min-[760px]:grid-cols-[minmax(230px,280px)_minmax(0,1fr)]">
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

          <p className="border-t border-border bg-muted/20 px-5 py-4 text-[11.5px] leading-relaxed text-muted-foreground sm:px-7">
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
  const options: { id: View; title: string; text: string; icon: ReactNode }[] = [
    {
      id: "bank",
      title: "Bank-Tragbarkeit",
      text: "Finanzierung und Einkommen prüfen",
      icon: <Landmark className="h-5 w-5" aria-hidden="true" />,
    },
    {
      id: "actual",
      title: "Effektive Wohnkosten",
      text: "Eigentum direkt mit Miete vergleichen",
      icon: <Home className="h-5 w-5" aria-hidden="true" />,
    },
  ]
  return (
    <div className="rounded-2xl border border-border bg-card p-2 shadow-sm" role="tablist" aria-label="Berechnungsansicht wählen">
      <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={`group flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
              active
                ? "border-primary bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(57,120,246,0.22)]"
                : "border-transparent bg-transparent hover:border-border hover:bg-muted/40"
            }`}
          >
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? "bg-white/15" : "bg-primary/8 text-primary"}`}>
              {option.icon}
            </span>
            <span className="min-w-0">
              <span className={`block text-sm font-extrabold ${active ? "text-primary-foreground" : "text-foreground"}`}>{option.title}</span>
              <span className={`mt-0.5 block text-[11.5px] ${active ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{option.text}</span>
            </span>
          </button>
        )
      })}
      </div>
    </div>
  )
}

function InputPanel({
  number,
  title,
  description,
  icon,
  children,
}: {
  number: string
  title: string
  description: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_10px_32px_rgba(24,49,92,0.04)]">
      <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary">
          {icon}
          <i className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-[9px] font-black not-italic text-white">
            {number}
          </i>
        </span>
        <div>
          <h2 className="text-sm font-black tracking-tight text-foreground">{title}</h2>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function InputSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/35 px-3 py-2.5">
      <span className="block text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
      <strong className="mt-1 block whitespace-nowrap text-sm font-black tabular-nums text-foreground">{value}</strong>
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
    { label: "Zinslast (5 %)", value: result.zinslast, color: seriesColor.blue },
    { label: "Amortisation", value: result.amortisation, color: seriesColor.green },
    { label: "Unterhalt / Nebenkosten", value: result.nebenkosten, color: seriesColor.amber },
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

      <div className="mt-5 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))]">
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
  const cashDifference = result.cashDifferenceAnnual
  const items = [
    { label: "Eigentümerkosten", note: "ohne Amortisation", value: result.ownershipCostAnnual, color: seriesColor.blue },
    { label: "Gesamter Cashflow", note: "inkl. Amortisation", value: result.cashOutflowAnnual, color: seriesColor.green },
    { label: "Vergleichsmiete", note: "inkl. Nebenkosten", value: result.rentAnnual, color: seriesColor.amber },
  ]
  return (
    <div className="min-w-0">
      <div className={`rounded-2xl border p-4 sm:p-5 ${
        difference <= 0
          ? "border-success/25 bg-gradient-to-br from-success/8 to-white"
          : "border-warning/35 bg-gradient-to-br from-warning/10 to-white"
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">Beratungsergebnis</p>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
            difference <= 0 ? "bg-success/12 text-success" : "bg-warning/15 text-warning-deep"
          }`}>
            {difference <= 0 ? "Eigentum kostengünstiger" : "Miete kostengünstiger"}
          </span>
        </div>
        <h3 className="mt-3 text-xl font-black leading-tight tracking-tight text-foreground sm:text-2xl">
          {formatCHF(Math.abs(difference) / 12)} {difference <= 0 ? "weniger" : "mehr"} pro Monat
        </h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
          Effektive Eigentümerkosten im Vergleich zur angegebenen Miete – Amortisation separat betrachtet.
        </p>
      </div>

      <div className="mt-4 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr))]">
        <Metric label="Eigentümerkosten" value={formatCHF(result.ownershipCostAnnual / 12)} period="pro Monat" tone="primary" />
        <Metric label="Cashflow" value={formatCHF(result.cashOutflowAnnual / 12)} period="inkl. Amortisation" tone="success" />
        <Metric label="Vergleichsmiete" value={formatCHF(result.rentAnnual / 12)} period="inkl. Nebenkosten" tone="warning" />
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface-subtle p-4 sm:p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-foreground">Monatlicher Vergleich</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Alle Werte auf derselben Basis</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">CHF / Monat</span>
        </div>
        <div className="mt-4 space-y-4">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-end justify-between gap-3">
                <span>
                  <strong className="block text-[11.5px] text-foreground">{item.label}</strong>
                  <small className="text-[10px] text-muted-foreground">{item.note}</small>
                </span>
                <span className="whitespace-nowrap text-sm font-black tabular-nums text-foreground">{formatCHF(item.value / 12)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-2 rounded-2xl border border-border bg-white p-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Hypothekarzins effektiv</p>
          <p className="mt-1 whitespace-nowrap text-base font-black tabular-nums text-foreground">{formatCHF(result.interestAnnual)} / Jahr</p>
        </div>
        <div className="border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Liquidität inkl. Amortisation</p>
          <p className="mt-1 whitespace-nowrap text-base font-black tabular-nums text-foreground">
            {formatCHF(Math.abs(cashDifference) / 12)} {cashDifference <= 0 ? "tiefer" : "höher"}
          </p>
        </div>
      </div>
    </div>
  )
}

function HouseFill({ title, total, totalLabel, segments }: { title: string; total: number; totalLabel: string; segments: HouseSegment[] }) {
  const id = useId().replace(/:/g, "")
  const usableHeight = 242
  let cursor = 276
  const annual = totalLabel.toLowerCase().includes("jahr")
  const rendered = segments.filter((segment) => segment.value > 0).map((segment) => {
    const height = Math.max(0, Math.min(usableHeight, (segment.value / total) * usableHeight))
    cursor -= height
    return { ...segment, height, y: cursor }
  })
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-subtle">
      <div className="border-b border-border bg-white px-4 py-3.5">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-primary">Visuelle Aufteilung</p>
        <h3 className="mt-1 text-sm font-black leading-snug text-foreground">{title}</h3>
      </div>
      <div className="px-4 pb-4 pt-3">
      <p className="text-center text-[10.5px] text-muted-foreground">Füllung von unten nach oben</p>
      <svg viewBox="0 0 320 300" className="mx-auto mt-1 h-auto w-full max-w-[238px]" role="img" aria-label={title}>
        <defs>
          <clipPath id={id}>
            <path d="M38 140 160 32 282 140 248 140 248 276 72 276 72 140Z" />
          </clipPath>
          <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor={gaugeArt.shadow} floodOpacity="0.14" />
          </filter>
        </defs>
        <g filter={`url(#${id}-shadow)`}>
          <path d="M38 140 160 32 282 140 248 140 248 276 72 276 72 140Z" fill={gaugeArt.houseFill} />
          <g clipPath={`url(#${id})`}>
            {rendered.map((segment) => (
              <rect
                key={segment.label}
                x="32"
                y={segment.y}
                width="256"
                height={segment.height}
                fill={segment.color}
                stroke="rgba(255,255,255,.78)"
                strokeWidth="2"
              >
                <title>{`${segment.label}: ${formatCHF(segment.value)}`}</title>
              </rect>
            ))}
          </g>
          <path
            d="M38 140 160 32 282 140 248 140 248 276 72 276 72 140Z"
            fill="none"
            stroke={gaugeArt.houseStroke}
            strokeWidth="6"
            strokeLinejoin="round"
          />
        </g>
      </svg>
      <div className="-mt-1 rounded-xl border border-border bg-white px-3 py-2.5 text-center shadow-sm">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{totalLabel}</span>
        <p className="mt-0.5 whitespace-nowrap text-lg font-black tabular-nums text-foreground">{formatCHF(total)}</p>
        {annual ? <p className="text-[10px] font-semibold text-muted-foreground">{formatCHF(total / 12)} pro Monat</p> : null}
      </div>
      <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
        {segments.map((segment) => (
          <div key={segment.label} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2.5 text-[11px]">
            <i className="h-3 w-3 rounded-[4px]" style={{ backgroundColor: segment.color }} />
            <span className="min-w-0 font-semibold text-muted-foreground">
              {segment.label}
            </span>
            <span className="whitespace-nowrap font-extrabold tabular-nums text-foreground">{formatCHF(segment.value)}</span>
          </div>
        ))}
      </div>
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
        <div className="absolute inset-y-0" style={{ left: "66.6%", width: "13.4%", backgroundColor: gaugeArt.band }} />
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
    <div className={last ? "" : "mb-5"}>
      <label className="mb-1.5 block text-[12.5px] font-bold text-foreground">{label}</label>
      <CurrencyInput label={label} value={value} step={cfg.step} onChange={onChange} />
      <input
        type="range"
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        value={Math.max(cfg.min, Math.min(cfg.max, value))}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className="mt-3 w-full accent-primary"
      />
      {sub ? (
        <div className={`mt-1.5 text-[10.5px] font-semibold ${sub.includes("unter") ? "text-warning-deep" : "text-muted-foreground"}`}>
          {sub}
        </div>
      ) : null}
    </div>
  )
}

function PercentField({ label, value, onChange, hint }: { label: string; value: number; onChange: (value: number) => void; hint?: string }) {
  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <span>
          <span className="block text-[12.5px] font-bold text-foreground">{label}</span>
          {hint ? <small className="mt-0.5 block text-[10px] text-muted-foreground">{hint}</small> : null}
        </span>
        <label className="flex items-center gap-1 rounded-xl border border-border bg-surface-tint px-3 py-2">
          <input
            type="number"
            min={0}
            max={15}
            step={0.05}
            value={value}
            onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
            aria-label={`${label} direkt eingeben`}
            className="w-16 bg-transparent text-right text-sm font-black tabular-nums outline-none"
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

function MoneyField({ label, value, onChange, period, hint, actionLabel, onAction, last }: {
  label: string
  value: number
  onChange: (value: number) => void
  period?: string
  hint?: string
  actionLabel?: string
  onAction?: () => void
  last?: boolean
}) {
  return (
    <div className={last ? "" : "mb-4"}>
      <div className="mb-1.5 flex items-end justify-between gap-2">
        <span>
          <label className="text-[12px] font-bold text-foreground">{label}</label>
          {period ? <span className="ml-1 text-[10px] font-medium text-muted-foreground">· {period}</span> : null}
          {hint ? <small className="mt-0.5 block text-[10px] text-muted-foreground">{hint}</small> : null}
        </span>
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction} className="whitespace-nowrap text-[9.5px] font-extrabold text-primary hover:underline">{actionLabel}</button>
        ) : null}
      </div>
      <CurrencyInput label={label} value={value} step={100} onChange={onChange} />
    </div>
  )
}

function CurrencyInput({ label, value, step, onChange }: {
  label: string
  value: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-border bg-surface-tint px-3 py-2.5 transition-colors focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10">
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">CHF</span>
      <input
        type="text"
        inputMode="numeric"
        value={formatInputNumber(value)}
        onChange={(event) => {
          const parsed = Number(event.target.value.replace(/[^0-9]/g, ""))
          onChange(Math.max(0, Number.isFinite(parsed) ? parsed : 0))
        }}
        aria-label={`${label} direkt eingeben`}
        data-step={step}
        className="w-full min-w-0 bg-transparent text-right text-sm font-black tabular-nums text-foreground outline-none"
      />
    </label>
  )
}

function formatInputNumber(value: number) {
  return new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(value)))
}

function Fact({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-muted/35 p-3.5">
      <div className="min-h-7 text-[9.5px] font-extrabold uppercase leading-3.5 tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="mt-1 whitespace-nowrap text-[clamp(15px,1.35vw,20px)] font-black tabular-nums tracking-[-0.025em] text-foreground">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  )
}

function Metric({ label, value, period, tone }: { label: string; value: string; period: string; tone: "primary" | "success" | "warning" }) {
  const classes = {
    primary: "border-primary/25 bg-primary/5 text-primary",
    success: "border-success/25 bg-success/5 text-success",
    warning: "border-warning/35 bg-warning/10 text-foreground",
  }
  return (
    <div className={`min-w-0 rounded-xl border p-3.5 ${classes[tone]}`}>
      <p className="min-h-7 text-[9.5px] font-bold uppercase leading-3.5 tracking-[0.08em] opacity-75">{label}</p>
      <p className="mt-1 whitespace-nowrap text-[clamp(15px,1.35vw,20px)] font-black tabular-nums tracking-[-0.025em]">{value}</p>
      <p className="mt-0.5 text-[9.5px] font-semibold opacity-70">{period}</p>
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

"use client"

import { useMemo, useRef, useState } from "react"
import useSWR from "swr"
import { ArrowUpRight } from "lucide-react"
import { ageGroupFromBirthYear, compareFranchises, type AgeGroup } from "@/lib/engine/franchise"
import { formatCHF } from "@/lib/format"
import { CalcActionBar, type CalcContext } from "@/components/portal/rechner/calc-action-bar"

type Location = { b: number; c: string; g: string; r: number; p: number; o: string }
type Offer = { r: number; a: AgeGroup; i: number; u: string; y: string; t: string; n: string; s: string; p: [number, number][] }
type Insurers = Record<string, string>

const MODEL_NAMES: Record<string, string> = {
  BASE: "Standardmodell",
  HAM: "Hausarztmodell",
  HMO: "HMO-Modell",
  DIV: "Alternatives Modell",
}
const AGE_NAMES: Record<AgeGroup, string> = {
  KIN: "Kind (bis 18)",
  JUG: "junge erwachsene Person (19–25)",
  ERW: "erwachsene Person (ab 26)",
}
const QUICK_COSTS = [0, 1000, 3000, 8000]

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`Datensatz konnte nicht geladen werden (${r.status}).`)
  return r.json()
})

const offerKey = (o: Offer) => [o.i, o.y, o.t, o.n, o.s].join("|")

export function FranchiseCalc({
  defaults,
  ctx,
}: {
  defaults?: { plz?: string; birthYear?: string }
  ctx?: CalcContext
}) {
  const { data: locations } = useSWR<Location[]>("/data/priminfo-2026/locations.json", fetcher)
  const { data: insurers } = useSWR<Insurers>("/data/priminfo-2026/insurers.json", fetcher)

  const [query, setQuery] = useState(defaults?.plz ?? "")
  const [location, setLocation] = useState<Location | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [birthYear, setBirthYear] = useState(defaults?.birthYear ?? "")
  const [accident, setAccident] = useState<"MIT" | "OHNE">("MIT")
  const [insurerId, setInsurerId] = useState("")
  const [tariffKey, setTariffKey] = useState("")
  const [currentFranchise, setCurrentFranchise] = useState<number | null>(null)
  const [healthCosts, setHealthCosts] = useState(1200)
  const [reserve, setReserve] = useState(3000)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const ageGroup = useMemo(() => ageGroupFromBirthYear(Number(birthYear), 2026), [birthYear])

  const { data: cantonData, isLoading: premiumsLoading } = useSWR<{
    year: number
    source: "live" | "bundle"
    offers: Offer[]
  }>(location && ageGroup ? `/api/franchise/premiums/${location.c}` : null, fetcher)

  const cantonOffers = cantonData?.offers

  const matches = useMemo(() => {
    if (!locations) return []
    const q = query.trim().toLocaleLowerCase("de-CH")
    if (q.length < 2) return []
    const numeric = /^\d+$/.test(q)
    return locations
      .filter((item) =>
        numeric
          ? String(item.p).startsWith(q)
          : `${item.o} ${item.g} ${item.p}`.toLocaleLowerCase("de-CH").includes(q),
      )
      .slice(0, 14)
  }, [locations, query])

  const offers = useMemo(() => {
    if (!cantonOffers || !location || !ageGroup) return []
    return cantonOffers.filter((o) => o.r === location.r && o.a === ageGroup && o.u === accident)
  }, [cantonOffers, location, ageGroup, accident])

  const offerMap = useMemo(() => new Map(offers.map((o) => [offerKey(o), o])), [offers])

  const insurerIds = useMemo(() => {
    if (!insurers) return []
    return [...new Set(offers.map((o) => o.i))].sort((a, b) =>
      (insurers[a] || "").localeCompare(insurers[b] || "", "de-CH"),
    )
  }, [offers, insurers])

  const tariffOffers = useMemo(() => {
    const id = Number(insurerId)
    if (!id) return []
    return offers
      .filter((o) => o.i === id)
      .sort((a, b) => {
        const aMin = Math.min(...a.p.map((x) => x[1]))
        const bMin = Math.min(...b.p.map((x) => x[1]))
        return a.y.localeCompare(b.y) || aMin - bMin || a.n.localeCompare(b.n, "de-CH")
      })
  }, [offers, insurerId])

  const selectedOffer = tariffKey ? offerMap.get(tariffKey) ?? null : null

  const comparison = useMemo(() => {
    if (!selectedOffer || !ageGroup) return []
    return compareFranchises(selectedOffer.p, Math.max(0, healthCosts), ageGroup)
  }, [selectedOffer, healthCosts, ageGroup])

  function pickLocation(loc: Location) {
    setLocation(loc)
    setQuery(`${loc.p} ${loc.o}`)
    setShowResults(false)
    setInsurerId("")
    setTariffKey("")
    setCurrentFranchise(null)
  }

  function pickInsurer(id: string) {
    setInsurerId(id)
    setTariffKey("")
    setCurrentFranchise(null)
  }

  function pickTariff(key: string) {
    setTariffKey(key)
    const o = offerMap.get(key)
    if (o) {
      const fr = o.p.map(([f]) => f)
      setCurrentFranchise(fr.includes(300) ? 300 : fr[0])
    } else {
      setCurrentFranchise(null)
    }
  }

  const ready = location && ageGroup && selectedOffer && comparison.length > 0
  const best = comparison[0]
  const current = comparison.find((r) => r.franchise === currentFranchise) ?? best
  const savings = ready ? Math.max(0, current.annualTotal - best.annualTotal) : 0
  const riskCap = best?.maximumCostSharing ?? 0
  const maxTotal = ready ? Math.max(...comparison.map((r) => r.annualTotal)) : 1
  const orderedByFranchise = useMemo(() => [...comparison].sort((a, b) => a.franchise - b.franchise), [comparison])

  return (
    <>
    <CalcActionBar
      ctx={ctx ?? {}}
      calcKey="health-franchise"
      buildPayload={() => ({
        calculator: "health-franchise",
        inputs: {
          ort: location ? `${location.p} ${location.o}` : query,
          geburtsjahr: birthYear,
          unfalldeckung: accident,
          versicherer: insurerId && insurers ? insurers[insurerId] : "",
          tarif: selectedOffer?.n ?? "",
          gesundheitskosten: healthCosts,
        },
        results: ready
          ? [
              `Beste Franchise CHF ${best.franchise}`,
              `Jahreskosten ${formatCHF(best.annualTotal)}`,
              savings > 0 ? `Ersparnis ${formatCHF(savings)}/Jahr` : "Bereits optimal",
            ]
          : ["Noch keine Auswahl getroffen"],
      })}
      onReset={() => {
        setLocation(null)
        setQuery(defaults?.plz ?? "")
        setBirthYear(defaults?.birthYear ?? "")
        setAccident("MIT")
        setInsurerId("")
        setTariffKey("")
        setCurrentFranchise(null)
        setHealthCosts(1200)
        setReserve(3000)
      }}
    />
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
      {/* Input panel */}
      <form className="rounded-2xl border border-border bg-card p-5" onSubmit={(e) => e.preventDefault()}>
        <PanelHeading step={1} title="Person und Wohnort" sub="Damit wir die richtige Prämienregion verwenden." />

        <div className="relative mt-4">
          <label htmlFor="loc" className="mb-1.5 block text-[13px] font-semibold text-foreground">
            PLZ oder Ort <span className="text-destructive">*</span>
          </label>
          <input
            id="loc"
            type="search"
            autoComplete="postal-code"
            placeholder="z. B. 8001 Zürich"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setLocation(null)
              setShowResults(true)
            }}
            onFocus={() => setShowResults(true)}
            onBlur={() => {
              blurTimer.current = setTimeout(() => setShowResults(false), 150)
            }}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
          />
          {showResults && matches.length > 0 ? (
            <div
              role="listbox"
              className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-popover shadow-lg"
              onMouseDown={() => blurTimer.current && clearTimeout(blurTimer.current)}
            >
              {matches.map((item, i) => (
                <button
                  key={`${item.p}-${item.o}-${i}`}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => pickLocation(item)}
                  className="flex w-full flex-col items-start gap-0.5 border-b border-border px-3 py-2 text-left last:border-0 hover:bg-secondary"
                >
                  <b className="text-sm text-foreground">
                    {item.p} {item.o}
                  </b>
                  <span className="text-[11px] text-muted-foreground">
                    Gemeinde {item.g} · {item.c} · Prämienregion {item.r}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          <p className="mt-1.5 text-[11.5px] text-muted-foreground">
            Die politische Gemeinde bestimmt die offizielle Prämienregion.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="by" className="mb-1.5 block text-[13px] font-semibold text-foreground">
              Geburtsjahr <span className="text-destructive">*</span>
            </label>
            <input
              id="by"
              type="number"
              min={1900}
              max={2026}
              inputMode="numeric"
              placeholder="1988"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <span className="mb-1.5 block text-[13px] font-semibold text-foreground">Unfalldeckung</span>
            <div className="flex gap-1 rounded-xl border border-border bg-secondary p-1">
              {(["MIT", "OHNE"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={accident === v}
                  onClick={() => setAccident(v)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-[12px] font-bold transition-colors ${
                    accident === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v === "MIT" ? "Mit Unfall" : "Ohne Unfall"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-2 text-[11.5px] text-muted-foreground">
          {ageGroup
            ? `Berechnet als ${AGE_NAMES[ageGroup]}; Prämienkategorie ${ageGroup}.`
            : "Bitte ein gültiges Geburtsjahr zwischen 1900 und 2026 eingeben."}
        </p>

        <div className="my-5 border-t border-border" />
        <PanelHeading step={2} title="Versicherung auswählen" sub="Nur tatsächlich angebotene Modelle werden angezeigt." />

        <div className="mt-4 space-y-3">
          <Select
            label="Versicherer"
            required
            disabled={insurerIds.length === 0}
            value={insurerId}
            onChange={pickInsurer}
            placeholder={insurerIds.length === 0 ? "Zuerst Wohnort und Geburtsjahr wählen" : "Versicherer auswählen"}
            options={insurerIds.map((id) => ({ value: String(id), label: insurers?.[id] || `Versicherer ${id}` }))}
          />
          <Select
            label="Modell / Tarif"
            required
            disabled={tariffOffers.length === 0}
            value={tariffKey}
            onChange={pickTariff}
            placeholder={tariffOffers.length === 0 ? "Zuerst Versicherer wählen" : "Modell / Tarif auswählen"}
            options={tariffOffers.map((o) => ({
              value: offerKey(o),
              label: `${MODEL_NAMES[o.y] || o.y} · ${o.n || o.t}${o.s ? ` · ${o.s}` : ""}`,
            }))}
          />
          <Select
            label="Aktuelle Franchise"
            disabled={!selectedOffer}
            value={currentFranchise != null ? String(currentFranchise) : ""}
            onChange={(v) => setCurrentFranchise(Number(v))}
            placeholder="—"
            options={(selectedOffer?.p ?? []).map(([f]) => ({ value: String(f), label: formatCHF(f) }))}
          />
        </div>

        {location && ageGroup ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-[11.5px] text-muted-foreground">
            {premiumsLoading || !cantonData ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                Prämien werden geladen …
              </>
            ) : cantonData.source === "live" ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
                <span>
                  <b className="font-semibold text-foreground">Live-Prämien {cantonData.year}</b> · direkt vom BAG
                  (opendata.swiss)
                </span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span>
                  <b className="font-semibold text-foreground">Prämien {cantonData.year}</b> · offizieller BAG-Datensatz
                </span>
              </>
            )}
          </div>
        ) : null}

        <div className="my-5 border-t border-border" />
        <PanelHeading step={3} title="Erwartete Gesundheitskosten" sub="Arzt, Medikamente, Therapie und Spital – ohne Prämien." />
        <div className="mt-4">
          <label htmlFor="hc" className="mb-1.5 block text-[13px] font-semibold text-foreground">
            Kosten pro Jahr in CHF
          </label>
          <input
            id="hc"
            type="number"
            min={0}
            max={100000}
            step={100}
            inputMode="decimal"
            value={healthCosts}
            onChange={(e) => setHealthCosts(Math.max(0, Number(e.target.value) || 0))}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
          />
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Schnellauswahl Gesundheitskosten">
            {QUICK_COSTS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setHealthCosts(c)}
                className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-bold transition-colors ${
                  healthCosts === c
                    ? "border-primary bg-accent text-accent-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {formatCHF(c)}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="rv" className="mb-1.5 block text-[13px] font-semibold text-foreground">
            Verfügbare Reserve in CHF
          </label>
          <input
            id="rv"
            type="number"
            min={0}
            step={100}
            inputMode="decimal"
            value={reserve}
            onChange={(e) => setReserve(Math.max(0, Number(e.target.value) || 0))}
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
          />
          <p className="mt-1.5 text-[11.5px] text-muted-foreground">Für die höchste mögliche Kostenbeteiligung.</p>
        </div>
      </form>

      {/* Results */}
      <section aria-live="polite" className="rounded-2xl border border-border bg-card p-6">
        {!ready ? (
          <div className="flex min-h-72 flex-col items-center justify-center text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <ArrowUpRight className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="text-lg font-extrabold text-foreground">Ihre persönliche Berechnung erscheint hier</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Wählen Sie links Wohnort, Geburtsjahr und Versicherungsmodell. Danach sehen Sie sofort den Vergleich aller
              angebotenen Franchisen.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                  Günstigste Variante im gewählten Szenario
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <strong className="text-3xl font-black text-foreground">{formatCHF(best.franchise)}</strong>
                  <span className="text-sm text-muted-foreground">Franchise</span>
                </div>
                <p className="mt-1 max-w-md text-[13px] text-muted-foreground">
                  {healthCosts === 0
                    ? "Bei keinen erwarteten Behandlungskosten zählt vor allem die tiefere Prämie."
                    : `Bei erwarteten Gesundheitskosten von ${formatCHF(healthCosts)} ergibt diese Franchise im Modell die tiefsten Gesamtkosten.`}
                </p>
              </div>
              <div className="text-right">
                <span className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Exakte Prämie
                </span>
                <b className="text-sm text-foreground">
                  {location!.g} · Region {location!.r}
                </b>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Metric label="Prämie pro Monat" value={formatCHF(best.monthlyPremium, 2)}>
                {insurers?.[selectedOffer!.i]} · {MODEL_NAMES[selectedOffer!.y] || selectedOffer!.y}
              </Metric>
              <Metric label="Gesamtkosten pro Jahr" value={formatCHF(best.annualTotal)}>
                Prämie plus Kostenbeteiligung
              </Metric>
              <Metric label="Vorteil zur aktuellen Franchise" value={savings > 0 ? formatCHF(savings) : "CHF 0"}>
                {best.franchise === current.franchise
                  ? "Ihre aktuelle Franchise ist hier bereits optimal"
                  : `gegenüber Franchise ${formatCHF(current.franchise)}`}
              </Metric>
            </div>

            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-[13px] ${
                reserve < riskCap
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : "border-success/30 bg-success/5 text-success"
              }`}
            >
              {reserve >= riskCap
                ? `Reserve ausreichend: Die maximale Kostenbeteiligung bei Franchise ${formatCHF(best.franchise)} beträgt ${formatCHF(riskCap)}.`
                : `Reserve beachten: Für Franchise ${formatCHF(best.franchise)} sollten bis zu ${formatCHF(riskCap)} verfügbar sein. Aktuell erfasst: ${formatCHF(reserve)}.`}
            </div>

            {/* Chart */}
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-foreground">Jahreskosten im Vergleich</h2>
                  <p className="text-[12.5px] text-muted-foreground">
                    Prämie und Ihre erwartete Kostenbeteiligung auf einen Blick.
                  </p>
                </div>
                <div className="flex gap-4 text-[12px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <i className="inline-block h-2.5 w-2.5 rounded-[3px] bg-primary" />
                    Prämie
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <i className="inline-block h-2.5 w-2.5 rounded-[3px] bg-[#c7b489]" />
                    Kostenbeteiligung
                  </span>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {orderedByFranchise.map((row) => (
                  <div
                    key={row.franchise}
                    className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${
                      row.franchise === best.franchise ? "bg-accent" : ""
                    }`}
                  >
                    <span className="w-16 text-[12px] font-bold tabular-nums text-foreground">
                      {formatCHF(row.franchise)}
                    </span>
                    <span className="flex h-4 flex-1 overflow-hidden rounded-md bg-muted">
                      <span className="h-full bg-primary" style={{ width: `${(row.annualPremium / maxTotal) * 100}%` }} />
                      <span className="h-full bg-[#c7b489]" style={{ width: `${(row.costSharing / maxTotal) * 100}%` }} />
                    </span>
                    <span className="w-24 text-right text-[12px] font-extrabold tabular-nums text-foreground">
                      {formatCHF(row.annualTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Table */}
            <details className="mt-5 rounded-xl border border-border">
              <summary className="cursor-pointer px-4 py-3 text-[13px] font-bold text-foreground">
                Alle Zahlen ansehen
              </summary>
              <div className="overflow-x-auto px-4 pb-4">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3 font-bold">Franchise</th>
                      <th className="py-2 pr-3 font-bold">Prämie / Monat</th>
                      <th className="py-2 pr-3 font-bold">Prämie / Jahr</th>
                      <th className="py-2 pr-3 font-bold">Kostenbeteiligung</th>
                      <th className="py-2 font-bold">Total / Jahr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderedByFranchise.map((row) => (
                      <tr
                        key={row.franchise}
                        className={`border-t border-border ${
                          row.franchise === best.franchise ? "font-bold text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        <td className="py-2 pr-3">
                          {formatCHF(row.franchise)}
                          {row.franchise === best.franchise ? " · empfohlen" : ""}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{formatCHF(row.monthlyPremium, 2)}</td>
                        <td className="py-2 pr-3 tabular-nums">{formatCHF(row.annualPremium)}</td>
                        <td className="py-2 pr-3 tabular-nums">{formatCHF(row.costSharing)}</td>
                        <td className="py-2 tabular-nums">{formatCHF(row.annualTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a
                href="https://www.priminfo.admin.ch/de/praemien"
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground hover:bg-secondary"
              >
                Auf Priminfo prüfen
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </>
        )}

        <p className="mt-6 border-t border-border pt-4 text-[12px] text-muted-foreground">
          Datenbasis 2026: offizielle genehmigte Grundversicherungsprämien und Prämienregionen des Bundesamts für
          Gesundheit BAG / Priminfo.
        </p>
      </section>
    </div>
    </>
  )
}

function PanelHeading({ step, title, sub }: { step: number; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-black text-primary-foreground">
        {step}
      </span>
      <div>
        <h2 className="text-[15px] font-extrabold text-foreground">{title}</h2>
        <p className="text-[12px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder: string
  disabled?: boolean
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function Metric({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <article className="rounded-xl border border-border bg-secondary/40 p-3">
      <span className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <strong className="mt-1 block text-xl font-black tabular-nums text-foreground">{value}</strong>
      <small className="mt-0.5 block text-[11.5px] text-muted-foreground">{children}</small>
    </article>
  )
}

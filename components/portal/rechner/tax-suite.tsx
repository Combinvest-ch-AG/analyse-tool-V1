"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  BadgeSwissFranc,
  Building2,
  CheckCircle2,
  Landmark,
  LoaderCircle,
  MapPin,
  PiggyBank,
  ReceiptText,
  Search,
  ShieldCheck,
} from "lucide-react"
import { CalcActionBar, type CalcContext, type SavedCalculatorPayload } from "@/components/portal/rechner/calc-action-bar"
import { formatCHF } from "@/lib/format"
import type { TaxLocation } from "@/lib/tax/estv"
import type { TaxPrefill } from "@/lib/tax/prefill"
import type { PropertyGainTaxResult } from "@/lib/tax/property-gains"

type Mode = "income" | "pillar3a" | "capital" | "property"
type Location = TaxLocation

type Profile = {
  taxYear: number
  taxLocationId: number
  relationship: 1 | 2 | 3 | 4
  confession1: 1 | 2 | 3 | 4 | 5
  confession2: 0 | 1 | 2 | 3 | 4 | 5
  children: number[]
  age1: number
  age2: number
  revenueType1: 1 | 2 | 3 | 4
  revenueType2: 0 | 1 | 2 | 3 | 4
  grossIncome1: number
  grossIncome2: number
  fortune: number
}

type IncomeResult = {
  source: "ESTV"
  totalTax: number
  federalTax: number
  cantonalTax: number
  municipalTax: number
  churchTax: number
  personalTax: number
  effectiveRate: number
  marginalRate: number
  taxableIncomeCanton: number
  taxableIncomeFederal: number
  taxableFortuneCanton: number
  grossIncome: number
  netIncomeAfterTax: number
  monthlyTax: number
  deductions: Array<{ label: string; canton: number; federal: number }>
  location: Location
}

type PillarResult = IncomeResult & {
  contribution: number
  maximumContribution: number
  taxAfterContribution: number
  annualSaving: number
  monthlySaving: number
  marginalSavingRate: number
}

type CapitalResult = {
  source: "ESTV"
  capital: number
  totalTax: number
  federalTax: number
  cantonalTax: number
  municipalTax: number
  churchTax: number
  netCapital: number
  effectiveRate: number
  location: Location
}

const DEFAULT_PROFILE: Profile = {
  taxYear: 2026,
  taxLocationId: 462200000,
  relationship: 1,
  confession1: 4,
  confession2: 0,
  children: [],
  age1: 35,
  age2: 35,
  revenueType1: 1,
  revenueType2: 0,
  grossIncome1: 100_000,
  grossIncome2: 0,
  fortune: 0,
}

const DEFAULT_LOCATION: Location = {
  TaxLocationID: 462200000,
  ZipCode: "4622",
  BfsID: 0,
  CantonID: 11,
  BfsName: "Egerkingen",
  City: "Egerkingen",
  Canton: "SO",
}

const MODES: Array<{ id: Mode; label: string; short: string; icon: typeof ReceiptText }> = [
  { id: "income", label: "Einkommenssteuer", short: "Lohn und Abzüge", icon: ReceiptText },
  { id: "pillar3a", label: "Säule 3a", short: "Steuerersparnis", icon: PiggyBank },
  { id: "capital", label: "Kapitalbezug", short: "Vorsorgegelder", icon: Landmark },
  { id: "property", label: "Immobilienverkauf", short: "Grundstückgewinn", icon: Building2 },
]

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function savedObject(saved?: SavedCalculatorPayload) {
  return (saved?.inputs && typeof saved.inputs === "object" ? saved.inputs : {}) as Record<string, unknown>
}

function locationLabel(location: Location) {
  return `${location.ZipCode} ${location.City || location.BfsName} (${location.Canton})`
}

export function TaxSuite({
  ctx,
  saved,
  initialMode = "income",
  prefill = {},
  initialLocation,
}: {
  ctx: CalcContext
  saved?: SavedCalculatorPayload
  initialMode?: Mode
  prefill?: TaxPrefill
  initialLocation?: TaxLocation
}) {
  const restored = savedObject(saved)
  const restoredLocation = restored.locationData && typeof restored.locationData === "object"
    ? restored.locationData as Location
    : undefined
  const startingLocation = restoredLocation?.TaxLocationID ? restoredLocation : initialLocation ?? DEFAULT_LOCATION
  const [mode, setMode] = useState<Mode>((restored.mode as Mode) || initialMode)
  const [profile, setProfile] = useState<Profile>({
    ...DEFAULT_PROFILE,
    taxLocationId: startingLocation.TaxLocationID,
    relationship: numberValue(restored.relationship, prefill.relationship?.value ?? DEFAULT_PROFILE.relationship) as Profile["relationship"],
    confession1: numberValue(restored.confession1, prefill.confession1?.value ?? DEFAULT_PROFILE.confession1) as Profile["confession1"],
    children: Array.isArray(restored.children) ? restored.children.map(Number) : prefill.children?.value ?? [],
    age1: numberValue(restored.age1, prefill.age1?.value ?? DEFAULT_PROFILE.age1),
    revenueType1: numberValue(restored.revenueType1, prefill.revenueType1?.value ?? DEFAULT_PROFILE.revenueType1) as Profile["revenueType1"],
    grossIncome1: numberValue(restored.grossIncome1, prefill.grossIncome1?.value ?? DEFAULT_PROFILE.grossIncome1),
    grossIncome2: numberValue(restored.grossIncome2, 0),
    fortune: numberValue(restored.fortune, prefill.fortune?.value ?? 0),
  })
  const [location, setLocation] = useState<Location>(startingLocation)
  const [locationQuery, setLocationQuery] = useState(locationLabel(startingLocation))
  const [locations, setLocations] = useState<Location[]>([])
  const [searching, setSearching] = useState(false)
  const [additionalDeductions, setAdditionalDeductions] = useState(numberValue(restored.additionalDeductions, 0))
  const [pillar3aContribution, setPillar3aContribution] = useState(numberValue(restored.pillar3aContribution, prefill.pillar3aContribution?.value ?? 0))
  const [hasPensionFund, setHasPensionFund] = useState(typeof restored.hasPensionFund === "boolean" ? restored.hasPensionFund : prefill.hasPensionFund?.value ?? true)
  const [capital, setCapital] = useState(numberValue(restored.capital, 200_000))
  const [gender, setGender] = useState<1 | 2>(restored.gender === 2 ? 2 : prefill.gender?.value ?? 1)
  const [ageAtPayment, setAgeAtPayment] = useState(numberValue(restored.ageAtPayment, 65))
  const [salePrice, setSalePrice] = useState(numberValue(restored.salePrice, 1_200_000))
  const [purchasePrice, setPurchasePrice] = useState(numberValue(restored.purchasePrice, 800_000))
  const [investments, setInvestments] = useState(numberValue(restored.investments, 100_000))
  const [transactionCosts, setTransactionCosts] = useState(numberValue(restored.transactionCosts ?? restored.sellingCosts, 35_000))
  const [deferredPriorGain, setDeferredPriorGain] = useState(numberValue(restored.deferredPriorGain, 0))
  const [holdingYears, setHoldingYears] = useState(numberValue(restored.holdingYears, 12))
  const [replacementPurchase, setReplacementPurchase] = useState(restored.replacementPurchase === true)
  const [replacementPrice, setReplacementPrice] = useState(numberValue(restored.replacementPrice, 0))
  const [result, setResult] = useState<IncomeResult | PillarResult | CapitalResult | PropertyGainTaxResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasPartner = profile.relationship === 2 || profile.relationship === 4
  const propertyGain = Math.max(0, salePrice - purchasePrice - investments - transactionCosts + deferredPriorGain)
  const propertyBasis = purchasePrice + investments + transactionCosts

  useEffect(() => {
    if (locationQuery === locationLabel(location) || locationQuery.trim().length < 2) {
      setLocations([])
      return
    }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const response = await fetch(`/api/tax/locations?q=${encodeURIComponent(locationQuery)}&year=${profile.taxYear}`)
        const payload = await response.json()
        setLocations(response.ok ? payload.data ?? [] : [])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [location, locationQuery, profile.taxYear])

  useEffect(() => {
    setResult(null)
    setError(null)
  }, [mode])

  async function calculate() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(mode === "property" ? "/api/tax/property" : "/api/tax/calculate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "property" ? {
          taxYear: profile.taxYear,
          location,
          confession: profile.confession1,
          salePrice,
          purchasePrice,
          investments,
          transactionCosts,
          deferredPriorGain,
          holdingYears,
          replacementPurchase,
          replacementPrice,
        } : {
          mode,
          profile,
          additionalDeductions,
          pillar3aContribution,
          hasPensionFund,
          capital,
          gender,
          ageAtPayment,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error?.message || "Berechnung fehlgeschlagen.")
      setResult(payload.data)
    } catch (reason) {
      setResult(null)
      setError(reason instanceof Error ? reason.message : "Berechnung fehlgeschlagen.")
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setProfile({
      ...DEFAULT_PROFILE,
      taxLocationId: initialLocation?.TaxLocationID ?? DEFAULT_PROFILE.taxLocationId,
      relationship: prefill.relationship?.value ?? DEFAULT_PROFILE.relationship,
      confession1: prefill.confession1?.value ?? DEFAULT_PROFILE.confession1,
      children: prefill.children?.value ?? [],
      age1: prefill.age1?.value ?? DEFAULT_PROFILE.age1,
      revenueType1: prefill.revenueType1?.value ?? DEFAULT_PROFILE.revenueType1,
      grossIncome1: prefill.grossIncome1?.value ?? DEFAULT_PROFILE.grossIncome1,
      fortune: prefill.fortune?.value ?? 0,
    })
    const resetLocation = initialLocation ?? DEFAULT_LOCATION
    setLocation(resetLocation)
    setLocationQuery(locationLabel(resetLocation))
    setAdditionalDeductions(0)
    setPillar3aContribution(prefill.pillar3aContribution?.value ?? 0)
    setHasPensionFund(prefill.hasPensionFund?.value ?? true)
    setCapital(200_000)
    setGender(prefill.gender?.value ?? 1)
    setAgeAtPayment(65)
    setSalePrice(1_200_000)
    setPurchasePrice(800_000)
    setInvestments(100_000)
    setTransactionCosts(35_000)
    setDeferredPriorGain(0)
    setHoldingYears(12)
    setReplacementPurchase(false)
    setReplacementPrice(0)
    setResult(null)
    setError(null)
  }

  const resultLines = useMemo(() => {
    if (mode === "property") {
      const value = result as PropertyGainTaxResult | null
      return [
        `Verkaufspreis ${formatCHF(salePrice)}`,
        `Anlagekosten ${formatCHF(propertyBasis)}`,
        `Grundstückgewinn ${formatCHF(value?.grossGain ?? propertyGain)}`,
        ...(value?.deferredGain ? [`Steueraufschub ${formatCHF(value.deferredGain)}`] : []),
        `Steuerbarer Gewinn ${formatCHF(value?.taxableGain ?? propertyGain)}`,
        ...(value?.totalTax != null ? [`Grundstückgewinnsteuer ${formatCHF(value.totalTax)}`] : []),
        `Besitzdauer ${holdingYears} Jahre`,
      ]
    }
    if (!result) return ["Offizielle ESTV-Berechnung noch nicht ausgeführt"]
    if (mode === "capital") {
      const value = result as CapitalResult
      return [
        `Kapitalbezug ${formatCHF(value.capital)}`,
        `Kapitalleistungssteuer ${formatCHF(value.totalTax)}`,
        `Nettoauszahlung ${formatCHF(value.netCapital)}`,
        `Effektive Belastung ${value.effectiveRate.toFixed(2)} %`,
      ]
    }
    if (mode === "pillar3a") {
      const value = result as PillarResult
      return [
        `Säule-3a-Einzahlung ${formatCHF(value.contribution)}`,
        `Steuerersparnis ${formatCHF(value.annualSaving)} pro Jahr`,
        `Steuer vor Einzahlung ${formatCHF(value.totalTax)}`,
        `Steuer nach Einzahlung ${formatCHF(value.taxAfterContribution)}`,
      ]
    }
    const value = result as IncomeResult
    return [
      `Gesamtsteuer ${formatCHF(value.totalTax)} pro Jahr`,
      `Steuer pro Monat ${formatCHF(value.monthlyTax)}`,
      `Effektive Belastung ${value.effectiveRate.toFixed(2)} %`,
      `Steuerbares Einkommen Kanton ${formatCHF(value.taxableIncomeCanton)}`,
    ]
  }, [holdingYears, mode, propertyBasis, propertyGain, result, salePrice])

  const prefillSources = Array.from(new Set(Object.values(prefill).map((entry) => entry?.source).filter(Boolean)))

  return (
    <>
      <CalcActionBar
        ctx={ctx}
        calcKey={`tax-${mode}`}
        buildPayload={() => ({
          calculator: `tax-${mode}`,
          inputs: {
            mode,
            taxYear: profile.taxYear,
            location: locationLabel(location),
            locationData: location,
            taxLocationId: profile.taxLocationId,
            relationship: profile.relationship,
            confession1: profile.confession1,
            children: profile.children,
            age1: profile.age1,
            grossIncome1: profile.grossIncome1,
            grossIncome2: profile.grossIncome2,
            fortune: profile.fortune,
            additionalDeductions,
            pillar3aContribution,
            hasPensionFund,
            capital,
            gender,
            ageAtPayment,
            salePrice,
            purchasePrice,
            investments,
            transactionCosts,
            deferredPriorGain,
            holdingYears,
            replacementPurchase,
            replacementPrice,
          },
          results: resultLines,
          dataSource: mode === "property" && result
            ? `${(result as PropertyGainTaxResult).sourceLabel} · ${(result as PropertyGainTaxResult).sourceAsOf}`
            : mode === "property"
              ? "Kantonale Grundstückgewinnsteuer · Berechnung noch nicht ausgeführt"
              : "ESTV Swiss Tax Calculator 2026",
        })}
        onReset={reset}
      />

      {prefillSources.length ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-success/20 bg-success/6 px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-2 font-bold text-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
            Bekannte Kundendaten wurden übernommen
          </span>
          <span className="text-xs font-semibold text-muted-foreground">{prefillSources.join(" · ")}</span>
        </div>
      ) : null}

      <nav aria-label="Steuerrechner auswählen" className="grid gap-2 rounded-3xl border border-border bg-card p-2 sm:grid-cols-2 xl:grid-cols-4">
        {MODES.map((item) => {
          const Icon = item.icon
          const active = mode === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setResult(null)
                setError(null)
                setMode(item.id)
              }}
              aria-pressed={active}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${active ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted"}`}
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? "bg-white/16" : "bg-primary/8 text-primary"}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-black">{item.label}</span>
                <span className={`block text-xs ${active ? "text-white/75" : "text-muted-foreground"}`}>{item.short}</span>
              </span>
            </button>
          )
        })}
      </nav>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        <section className="space-y-4" aria-label="Eingaben">
          <Panel number="1" title="Steuerort" description="Gemeinde am Wohnsitz bzw. beim Kapitalbezug">
            <label className="block text-sm font-bold text-foreground" htmlFor="tax-location">Gemeinde oder PLZ</label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input
                id="tax-location"
                value={locationQuery}
                onChange={(event) => setLocationQuery(event.target.value)}
                autoComplete="off"
                className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-10 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              {searching ? <LoaderCircle className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-primary" /> : null}
              {locations.length ? (
                <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-card p-1 shadow-xl">
                  {locations.map((item) => (
                    <button
                      key={item.TaxLocationID}
                      type="button"
                      onClick={() => {
                        setLocation(item)
                        setLocationQuery(locationLabel(item))
                        setProfile((current) => ({ ...current, taxLocationId: item.TaxLocationID }))
                        setLocations([])
                        setResult(null)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-muted"
                    >
                      <MapPin className="h-4 w-4 text-primary" />
                      {locationLabel(item)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-xs">
              <span className="font-semibold text-muted-foreground">Verwendeter Steuerort</span>
              <span className="font-black text-foreground">{locationLabel(location)}</span>
            </div>
          </Panel>

          {mode !== "property" ? (
            <Panel number="2" title="Persönliche Situation" description="Diese Angaben bestimmen Tarif und Abzüge">
              <SelectField
                label="Zivilstand"
                value={profile.relationship}
                onChange={(value) => setProfile((current) => ({ ...current, relationship: value as Profile["relationship"] }))}
                options={[
                  [1, "Ledig / geschieden / verwitwet"],
                  [2, "Verheiratet"],
                  [3, "Konkubinat"],
                  [4, "Eingetragene Partnerschaft"],
                ]}
              />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <NumberField label="Alter" value={profile.age1} onChange={(value) => setProfile((current) => ({ ...current, age1: value }))} />
                <NumberField
                  label="Anzahl Kinder"
                  value={profile.children.length}
                  min={0}
                  max={10}
                  onChange={(count) => setProfile((current) => ({ ...current, children: Array.from({ length: count }, (_, index) => current.children[index] ?? 8) }))}
                />
              </div>
              {profile.children.length ? (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-bold text-foreground">Alter der Kinder</p>
                  <div className="grid grid-cols-3 gap-2">
                    {profile.children.map((age, index) => (
                      <NumberField
                        key={index}
                        label={`Kind ${index + 1}`}
                        value={age}
                        min={0}
                        max={100}
                        onChange={(value) => setProfile((current) => ({
                          ...current,
                          children: current.children.map((item, childIndex) => childIndex === index ? value : item),
                        }))}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-4">
                <SelectField
                  label="Konfession"
                  value={profile.confession1}
                  onChange={(value) => setProfile((current) => ({ ...current, confession1: value as Profile["confession1"] }))}
                  options={[[4, "Keine"], [1, "Reformiert"], [2, "Römisch-katholisch"], [3, "Christkatholisch"], [5, "Andere"]]}
                />
              </div>
              {hasPartner ? (
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
                  <NumberField label="Alter Person 2" value={profile.age2} min={18} max={100} onChange={(value) => setProfile((current) => ({ ...current, age2: value }))} />
                  <SelectField
                    label="Konfession Person 2"
                    value={profile.confession2 || 4}
                    onChange={(value) => setProfile((current) => ({ ...current, confession2: value as Profile["confession2"] }))}
                    options={[[4, "Keine"], [1, "Reformiert"], [2, "Römisch-katholisch"], [3, "Christkatholisch"], [5, "Andere"]]}
                  />
                </div>
              ) : null}
            </Panel>
          ) : null}

          {mode === "income" || mode === "pillar3a" ? (
            <Panel number="3" title="Einkommen und Vermögen" description="Bruttowerte pro Jahr">
              <SelectField
                label="Erwerbssituation Person 1"
                value={profile.revenueType1}
                onChange={(value) => setProfile((current) => ({ ...current, revenueType1: value as Profile["revenueType1"] }))}
                options={[[1, "Angestellt"], [2, "Selbstständig"], [3, "Pensioniert"], [4, "Ohne Erwerb / andere"]]}
              />
              <div className="mt-4">
              <MoneyField label="Bruttolohn Person 1" value={profile.grossIncome1} onChange={(value) => setProfile((current) => ({ ...current, grossIncome1: value }))} />
              </div>
              {hasPartner ? (
                <div className="mt-4 space-y-4">
                  <SelectField
                    label="Erwerbssituation Person 2"
                    value={profile.revenueType2 || 1}
                    onChange={(value) => setProfile((current) => ({ ...current, revenueType2: value as Profile["revenueType2"] }))}
                    options={[[1, "Angestellt"], [2, "Selbstständig"], [3, "Pensioniert"], [4, "Ohne Erwerb / andere"]]}
                  />
                  <MoneyField label="Bruttolohn Person 2" value={profile.grossIncome2} onChange={(value) => setProfile((current) => ({ ...current, grossIncome2: value }))} />
                </div>
              ) : null}
              <div className="mt-4"><MoneyField label="Steuerbares Vermögen" value={profile.fortune} onChange={(value) => setProfile((current) => ({ ...current, fortune: value }))} /></div>
              {mode === "income" ? (
                <div className="mt-4"><MoneyField label="Zusätzliche bestätigte Abzüge" value={additionalDeductions} onChange={setAdditionalDeductions} hint="Nur Abzüge ergänzen, die nicht bereits automatisch berücksichtigt werden." /></div>
              ) : (
                <div className="mt-4 space-y-4 border-t border-border pt-4">
                  <MoneyField label="Einzahlung Säule 3a" value={pillar3aContribution} onChange={setPillar3aContribution} />
                  <Toggle label="An eine Pensionskasse angeschlossen" checked={hasPensionFund} onChange={setHasPensionFund} />
                </div>
              )}
            </Panel>
          ) : null}

          {mode === "capital" ? (
            <Panel number="3" title="Kapitalbezug" description="Auszahlung aus 2. Säule oder Säule 3a">
              <MoneyField label="Geplanter Kapitalbezug" value={capital} onChange={setCapital} />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <SelectField label="Geschlecht" value={gender} onChange={(value) => setGender(value as 1 | 2)} options={[[1, "Männlich"], [2, "Weiblich"]]} />
                <NumberField label="Alter bei Bezug" value={ageAtPayment} min={18} max={100} onChange={setAgeAtPayment} />
              </div>
            </Panel>
          ) : null}

          {mode === "property" ? (
            <Panel number="2" title="Verkauf und Anlagekosten" description="Grundlage des Grundstückgewinns">
              <MoneyField label="Verkaufspreis" value={salePrice} onChange={setSalePrice} />
              <div className="mt-4"><MoneyField label="Damals bezahlter Kaufpreis" value={purchasePrice} onChange={setPurchasePrice} /></div>
              <div className="mt-4"><MoneyField label="Wertvermehrende Investitionen" value={investments} onChange={setInvestments} /></div>
              <div className="mt-4"><MoneyField label="Makler-, Notar- und Handänderungskosten" value={transactionCosts} onChange={setTransactionCosts} /></div>
              <div className="mt-4"><MoneyField label="Früher aufgeschobener Grundstückgewinn" value={deferredPriorGain} onChange={setDeferredPriorGain} hint="Nur eintragen, wenn aus einer früheren Ersatzbeschaffung ein Gewinn auf dieses Objekt übertragen wurde." /></div>
              <div className="mt-4"><NumberField label="Besitzdauer in Jahren" value={holdingYears} min={0} max={100} onChange={setHoldingYears} /></div>
              <div className="mt-4">
                <SelectField
                  label="Kirchenzugehörigkeit"
                  value={profile.confession1}
                  onChange={(value) => setProfile((current) => ({ ...current, confession1: value as Profile["confession1"] }))}
                  options={[[4, "Keine"], [1, "Reformiert"], [2, "Römisch-katholisch"], [3, "Christkatholisch"], [5, "Andere"]]}
                />
              </div>
              <div className="mt-5 space-y-4 border-t border-border pt-5">
                <Toggle label="Selbstbewohntes Ersatzobjekt geplant" checked={replacementPurchase} onChange={setReplacementPurchase} />
                {replacementPurchase ? <MoneyField label="Kaufpreis / Baukosten Ersatzobjekt" value={replacementPrice} onChange={setReplacementPrice} /> : null}
              </div>
            </Panel>
          ) : null}

          <button
            type="button"
            onClick={() => void calculate()}
            disabled={loading}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground shadow-md transition hover:bg-primary-deep disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BadgeSwissFranc className="h-4 w-4" />}
            {loading ? "Amtliche Daten werden berechnet …" : mode === "property" ? "Kantonale Steuer berechnen" : "Mit ESTV-Daten berechnen"}
          </button>
        </section>

        <section aria-live="polite" className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card shadow-[0_18px_50px_rgba(24,49,92,0.06)]">
          <div className="border-b border-border bg-gradient-to-r from-primary/[0.07] to-white px-6 py-5 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">Ihr Ergebnis</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-foreground">{MODES.find((item) => item.id === mode)?.label}</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/8 px-3 py-1.5 text-xs font-bold text-success">
                <ShieldCheck className="h-4 w-4" />
                {mode === "property" && result
                  ? (result as PropertyGainTaxResult).supported ? "Amtlicher Kantonstarif" : "Amtliche Prüfung nötig"
                  : mode === "property" ? "Kantonale Berechnung" : "Offizielle ESTV-Berechnung"}
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {error ? <div className="rounded-2xl border border-destructive/20 bg-destructive/6 p-4 text-sm font-semibold text-destructive">{error}</div> : null}
            {mode === "property" && result ? (
              <PropertyResult result={result as PropertyGainTaxResult} />
            ) : result ? (
              mode === "capital" ? <CapitalResultView result={result as CapitalResult} /> : mode === "pillar3a" ? <PillarResultView result={result as PillarResult} /> : <IncomeResultView result={result as IncomeResult} />
            ) : (
              <EmptyResult loading={loading} />
            )}
          </div>
        </section>
      </div>
    </>
  )
}

function Panel({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-[0_10px_30px_rgba(24,49,92,0.035)]">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-black text-white">{number}</span>
        <div><h2 className="font-black text-foreground">{title}</h2><p className="mt-0.5 text-xs text-muted-foreground">{description}</p></div>
      </div>
      {children}
    </div>
  )
}

function MoneyField({ label, value, onChange, hint }: { label: string; value: number; onChange: (value: number) => void; hint?: string }) {
  return (
    <label className="block text-sm font-bold text-foreground">
      {label}
      <span className="mt-2 flex h-11 items-center rounded-xl border border-border bg-background px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
        <span className="mr-2 text-xs font-bold text-muted-foreground">CHF</span>
        <input type="number" min={0} step={100} value={value} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} className="min-w-0 flex-1 bg-transparent text-right text-sm font-black outline-none" />
      </span>
      {hint ? <span className="mt-1.5 block text-xs font-normal leading-relaxed text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

function NumberField({ label, value, min = 0, max = 100, onChange }: { label: string; value: number; min?: number; max?: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-sm font-bold text-foreground">
      {label}
      <input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value) || 0)))} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-right text-sm font-black outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
    </label>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: number; onChange: (value: number) => void; options: Array<[number, string]> }) {
  return (
    <label className="block text-sm font-bold text-foreground">
      {label}
      <select value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
        {options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
      </select>
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-muted/60 px-3 py-2.5 text-sm font-semibold">
      {label}
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-primary" />
    </label>
  )
}

function EmptyResult({ loading }: { loading: boolean }) {
  return (
    <div className="grid min-h-[440px] place-items-center text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/8 text-primary"><BadgeSwissFranc className="h-8 w-8" /></span>
        <h3 className="mt-5 text-xl font-black text-foreground">Persönliche Steuerbelastung berechnen</h3>
        <p className="mt-2 leading-relaxed text-muted-foreground">{loading ? "Die ESTV berechnet Bund, Kanton, Gemeinde und Kirchensteuer." : "Prüfen Sie die Angaben links und starten Sie die offizielle Berechnung."}</p>
      </div>
    </div>
  )
}

function Stat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "primary" | "success" | "danger" }) {
  const classes = tone === "primary" ? "border-primary/25 bg-primary/7 text-primary" : tone === "success" ? "border-success/25 bg-success/7 text-success" : tone === "danger" ? "border-destructive/25 bg-destructive/6 text-destructive" : "border-border bg-muted/45 text-foreground"
  return <div className={`min-w-0 rounded-2xl border p-4 ${classes}`}><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] opacity-70">{label}</p><p className="mt-1 break-words text-xl font-black tracking-tight sm:text-2xl">{value}</p></div>
}

function Breakdown({ items, total }: { items: Array<{ label: string; value: number; color: string }>; total: number }) {
  return (
    <div className="mt-7 rounded-2xl border border-border bg-muted/35 p-5">
      <h3 className="font-black text-foreground">So setzt sich der Betrag zusammen</h3>
      <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-muted">
        {items.filter((item) => item.value > 0).map((item) => <span key={item.label} style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%`, backgroundColor: item.color }} title={`${item.label}: ${formatCHF(item.value)}`} />)}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2 text-muted-foreground"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span><strong>{formatCHF(item.value)}</strong></div>)}
      </div>
    </div>
  )
}

function IncomeResultView({ result }: { result: IncomeResult }) {
  const breakdown = [
    { label: "Direkte Bundessteuer", value: result.federalTax, color: "#3478F6" },
    { label: "Kantonssteuer", value: result.cantonalTax, color: "#22A96D" },
    { label: "Gemeindesteuer", value: result.municipalTax, color: "#F5A623" },
    { label: "Kirchen- und Personalsteuer", value: result.churchTax + result.personalTax, color: "#8B5CF6" },
  ]
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Steuern pro Jahr" value={formatCHF(result.totalTax)} tone="primary" />
        <Stat label="Steuern pro Monat" value={formatCHF(result.monthlyTax)} />
        <Stat label="Effektive Belastung" value={`${result.effectiveRate.toFixed(2)} %`} />
        <Stat label="Netto nach Abgaben & Steuer" value={formatCHF(result.netIncomeAfterTax)} tone="success" />
        <Stat label="Steuerbares Einkommen Kanton" value={formatCHF(result.taxableIncomeCanton)} />
        <Stat label="Grenzsteuersatz" value={`${result.marginalRate.toFixed(2)} %`} />
      </div>
      <Breakdown items={breakdown} total={result.totalTax} />
      {result.deductions.length ? (
        <details className="mt-5 rounded-2xl border border-border p-4">
          <summary className="cursor-pointer font-bold">Automatisch berücksichtigte Abzüge ({result.deductions.length})</summary>
          <div className="mt-4 space-y-2">{result.deductions.slice(0, 12).map((item, index) => <div key={`${item.label}-${index}`} className="flex justify-between gap-4 text-sm"><span className="text-muted-foreground">{item.label}</span><strong>{formatCHF(Math.max(item.canton, item.federal))}</strong></div>)}</div>
        </details>
      ) : null}
    </>
  )
}

function PillarResultView({ result }: { result: PillarResult }) {
  const maxTax = Math.max(1, result.totalTax)
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Steuerersparnis pro Jahr" value={formatCHF(result.annualSaving)} tone="success" />
        <Stat label="Pro Monat" value={formatCHF(result.monthlySaving)} />
        <Stat label="Wirkung der Einzahlung" value={`${result.marginalSavingRate.toFixed(2)} %`} />
      </div>
      <div className="mt-7 rounded-2xl border border-border bg-muted/35 p-5">
        <h3 className="font-black">Steuern vor und nach der Einzahlung</h3>
        <div className="mt-5 space-y-5">
          <ComparisonRow label="Ohne Säule 3a" value={result.totalTax} max={maxTax} color="#94A3B8" />
          <ComparisonRow label={`Mit ${formatCHF(result.contribution)} Säule 3a`} value={result.taxAfterContribution} max={maxTax} color="#22A96D" />
        </div>
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p><strong>Offiziell berechnete Differenz:</strong> Die Einzahlung reduziert die steuerbaren Einkommen bei Bund und Kanton. Maximal berücksichtigt: {formatCHF(result.maximumContribution)}.</p>
      </div>
    </>
  )
}

function CapitalResultView({ result }: { result: CapitalResult }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Kapitalbezug" value={formatCHF(result.capital)} />
        <Stat label="Kapitalleistungssteuer" value={formatCHF(result.totalTax)} tone="danger" />
        <Stat label="Nettoauszahlung" value={formatCHF(result.netCapital)} tone="success" />
      </div>
      <Breakdown total={result.totalTax} items={[
        { label: "Bund", value: result.federalTax, color: "#3478F6" },
        { label: "Kanton", value: result.cantonalTax, color: "#22A96D" },
        { label: "Gemeinde", value: result.municipalTax, color: "#F5A623" },
        { label: "Kirche", value: result.churchTax, color: "#8B5CF6" },
      ]} />
      <p className="mt-5 text-sm leading-relaxed text-muted-foreground">Effektive Belastung: <strong className="text-foreground">{result.effectiveRate.toFixed(2)} %</strong>. Mehrere Bezüge im gleichen Steuerjahr können gemeinsam besteuert werden.</p>
    </>
  )
}

function PropertyResult({ result }: { result: PropertyGainTaxResult }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Grundstückgewinn" value={formatCHF(result.grossGain)} />
        <Stat label="Steuerbarer Gewinn" value={formatCHF(result.taxableGain)} />
        <Stat
          label="Grundstückgewinnsteuer"
          value={result.totalTax == null ? "Amtlich prüfen" : formatCHF(result.totalTax)}
          tone={result.totalTax == null ? "default" : "danger"}
        />
      </div>
      <div className="mt-7 rounded-2xl border border-border bg-muted/35 p-5">
        <h3 className="font-black">Vom Verkaufspreis zur Steuer</h3>
        <div className="mt-5 space-y-3">
          <ComparisonRow label="Verkaufspreis" value={result.salePrice} max={Math.max(1, result.salePrice)} color="#3478F6" />
          <ComparisonRow label="Anlagekosten" value={result.investmentBasis} max={Math.max(1, result.salePrice)} color="#94A3B8" />
          <ComparisonRow label="Grundstückgewinn" value={result.grossGain} max={Math.max(1, result.salePrice)} color="#F59E0B" />
          {result.deferredGain > 0 ? <ComparisonRow label="Aufgeschobener Gewinn" value={result.deferredGain} max={Math.max(1, result.salePrice)} color="#8B5CF6" /> : null}
          <ComparisonRow label="Steuerbarer Gewinn" value={result.taxableGain} max={Math.max(1, result.salePrice)} color="#EF4444" />
        </div>
      </div>
      {result.components.length ? <Breakdown items={result.components.map((item, index) => ({ ...item, color: ["#3478F6", "#22A96D", "#8B5CF6"][index] ?? "#F5A623" }))} total={result.totalTax ?? 0} /> : null}
      <div className={`mt-5 rounded-2xl border p-5 text-sm leading-relaxed ${result.supported ? "border-primary/20 bg-primary/5 text-foreground" : "border-amber-300 bg-amber-50 text-amber-950"}`}>
        <strong>{result.supported ? `${result.sourceLabel}:` : "Amtliche Tarifprüfung erforderlich:"}</strong> {result.message}
        <a href={result.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 block font-bold text-primary underline underline-offset-4">
          Amtliche Grundlage öffnen
        </a>
      </div>
    </>
  )
}

function ComparisonRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return <div><div className="mb-2 flex items-end justify-between gap-3 text-sm"><span className="font-semibold text-muted-foreground">{label}</span><strong className="text-base">{formatCHF(value)}</strong></div><div className="h-3 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (value / max) * 100)}%`, backgroundColor: color }} /></div></div>
}

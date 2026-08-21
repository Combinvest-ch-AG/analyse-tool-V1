"use client"

import { useMemo, useState } from "react"
import { Check, ArrowRight, Sparkles } from "lucide-react"
import { formatCHF } from "@/lib/format"
import { CalcActionBar, type SavedCalculatorPayload } from "@/components/portal/rechner/calc-action-bar"
import type { SealthDerivation, SealthPlanKey } from "@/lib/sealth/derive"

type Plan = { name: string; annual: number; monthly: number; desc: string; benefits: string[] }

const PLANS: Record<SealthPlanKey, Plan> = {
  coach: { name: "Sealth Coach", annual: 150, monthly: 12.5, desc: "App und persönliches Basis-Coaching.", benefits: ["MySealth App", "Persönliches Basis-Coaching", "Videos & Seminare"] },
  tax: { name: "Sealth Tax Assist", annual: 220, monthly: 19.9, desc: "Steuererklärung, App und Coaching.", benefits: ["Steuererklärung vom Profi", "MySealth App", "Coaching sowie Videos & Seminare"] },
  protect: { name: "Sealth Protect", annual: 597, monthly: 59, desc: "Wealth-Service mit integriertem Rechtsschutz.", benefits: ["Finanzcoaching und Steuererklärung", "Versicherungstreuhand und Schadenmanager", "Rechtsschutz (Dextra)", "Basis-Fitness in selektierten Centern", "MySealth App"] },
  sealth: { name: "Sealth", annual: 897, monthly: 79.9, desc: "Wealth-Service und umfassende Health-Leistungen.", benefits: ["Finanzcoaching und Steuererklärung", "Versicherungstreuhand und Schadenmanager", "Fitpass: Partnernetzwerk, Sport & Wellness", "Unlimitierte Flatrate", "MySealth App"] },
  premium: { name: "Sealth Premium", annual: 997, monthly: 87, desc: "Wealth, Health, Self und Rechtsschutz vereint.", benefits: ["Alle Wealth-Leistungen", "Fitpass Health-Angebot", "Rechtsschutz (Dextra)", "Videos & Seminare", "MySealth App"] },
}

const PLAN_ORDER: SealthPlanKey[] = ["coach", "tax", "protect", "sealth", "premium"]

function pct(v: number, max: number) {
  return Math.round((Math.min(v, max) / max) * 100) + "%"
}
function priceMonthly(n: number) {
  return "CHF " + n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function healthEligible(k: SealthPlanKey) {
  return k === "protect" || k === "sealth" || k === "premium"
}

export function SealthCheck({
  ctx,
  derived,
  saved,
}: {
  ctx: { analysisId?: string; customerId?: string }
  derived: SealthDerivation
  saved?: SavedCalculatorPayload
}) {
  const recommended = derived.recommended
  const restoredPlan = PLAN_ORDER.includes(saved?.selectedPackage as SealthPlanKey)
    ? (saved?.selectedPackage as SealthPlanKey)
    : null
  const restoredScenario = saved?.scenario as Record<string, unknown> | undefined
  const [selected, setSelected] = useState<SealthPlanKey | null>(restoredPlan)

  // scenario inputs (prefilled from profiling + contract data)
  const [taxCost, setTaxCost] = useState(Number(restoredScenario?.tax) || derived.prefill.tax)
  const [fitnessCost, setFitnessCost] = useState(Number(restoredScenario?.fitnessMonthly) || derived.prefill.fitnessMonthly)
  const [legalCost, setLegalCost] = useState(Number(restoredScenario?.legal) || derived.prefill.legal)
  const [timeValue, setTimeValue] = useState(Number(restoredScenario?.time) || 300)
  const [healthRefund, setHealthRefund] = useState(Number(restoredScenario?.healthRefund) || 200)

  const activePlan = selected ?? recommended

  const scenario = useMemo(() => {
    const p = PLANS[activePlan]
    let value = taxCost || 0
    const includesHealth = healthEligible(activePlan)
    const includesLegal = activePlan === "protect" || activePlan === "premium"
    if (activePlan === "coach") value = 0
    if (includesHealth) {
      value += (fitnessCost || 0) * 12
      value += healthRefund || 0
    }
    if (includesLegal) value += legalCost || 0
    value += timeValue || 0
    const net = value - p.annual
    return { net, value }
  }, [activePlan, taxCost, fitnessCost, legalCost, timeValue, healthRefund])

  const payload = {
    scores: derived.scores,
    recommendation: recommended,
    selectedPackage: activePlan,
    annualPrice: PLANS[activePlan].annual,
    derivedFrom: { sportLevel: derived.sportLevel, hasRechtsschutz: derived.hasRechtsschutz, taxPref: derived.taxPref },
    scenario: {
      potentialNet: scenario.net,
      replaceableValue: scenario.value,
      tax: taxCost,
      fitnessMonthly: fitnessCost,
      legal: legalCost,
      time: timeValue,
      healthRefund,
    },
  }

  const actionBar = (
    <CalcActionBar
      ctx={ctx}
      calcKey="sealth-check"
      buildPayload={() => payload}
      onReset={() => {
        setSelected(null)
        setTaxCost(derived.prefill.tax)
        setFitnessCost(derived.prefill.fitnessMonthly)
        setLegalCost(derived.prefill.legal)
        setTimeValue(300)
        setHealthRefund(200)
      }}
    />
  )

  const p = PLANS[activePlan]
  const benefitList = [...p.benefits]
  if (healthEligible(activePlan)) benefitList.push("Bestätigungsdokument für mögliche Krankenkassen-Rückerstattung")
  const dims: [string, string][] = [
    ["Wealth", pct(derived.scores.wealth, 6)],
    ["Health", pct(derived.scores.health, 4)],
    ["Schutz", pct(derived.scores.legal, 4)],
  ]

  return (
    <>
      {actionBar}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Recommendation */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Ihre persönliche Empfehlung</p>
          <h2 className="mt-1 text-2xl font-bold text-foreground">
            {p.name}
            <span className="ml-2 text-sm font-semibold text-muted-foreground">
              {activePlan === recommended ? "· Empfehlung" : "· Alternative"}
            </span>
          </h2>
          <p className="mt-1 text-lg font-bold tabular-nums text-primary">
            {formatCHF(p.annual)} / Jahr · {priceMonthly(p.monthly)} / Monat
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {p.desc}{" "}
            {activePlan === recommended
              ? "Dieses Paket passt gemäss Profiling und Vertragscheck am besten."
              : "Diese Variante wurde alternativ zur persönlichen Empfehlung ausgewählt."}
          </p>

          {/* Auto-derived reasons */}
          <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3">
            <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Automatisch aus Profiling &amp; Vertragscheck abgeleitet
            </p>
            <ul className="mt-2 space-y-1.5">
              {derived.reasons.map((r) => (
                <li key={r} className="flex items-start gap-2 text-[13px] text-foreground">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {dims.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-background p-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-base font-bold tabular-nums text-foreground">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {benefitList.map((b) => (
              <div key={b} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial scenario */}
        <aside className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-bold text-foreground">Finanzielles Szenario</h2>
          <p className={`mt-2 text-2xl font-bold tabular-nums ${scenario.net >= 0 ? "text-success" : "text-destructive"}`}>
            {scenario.net >= 0 ? "+ " : "− "}
            {formatCHF(Math.abs(scenario.net))} / Jahr
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {scenario.net >= 0
              ? "Möglicher Mehrwert inklusive der eingetragenen Krankenkassenbeteiligung."
              : "Das gewählte Paket kostet in diesem Szenario mehr als die eingetragenen direkt ersetzbaren Aufwände."}
          </p>

          <div className="mt-4 space-y-3">
            {[
              ["Steuererklärung heute / Jahr", taxCost, setTaxCost, 10],
              ["Fitness & Wellness / Monat", fitnessCost, setFitnessCost, 10],
              ["Rechtsschutz / Jahr", legalCost, setLegalCost, 10],
              ["Wert gesparter Zeit / Jahr", timeValue, setTimeValue, 50],
              ["Mögliche Krankenkassen-Rückerstattung", healthRefund, setHealthRefund, 10],
            ].map(([label, value, setter, step]) => (
              <label key={label as string} className="block">
                <span className="text-xs font-medium text-muted-foreground">{label as string}</span>
                <input
                  type="number"
                  min={0}
                  step={step as number}
                  value={value as number}
                  onChange={(e) => (setter as (n: number) => void)(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground tabular-nums outline-none focus:border-primary"
                />
              </label>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            <b className="text-foreground">Krankenkassenbestätigung:</b> Für die Einreichung kann ein anerkanntes
            Bestätigungsdokument ausgestellt werden. CHF 200 dienen als Ausgangswert; die tatsächliche Rückerstattung
            hängt von Krankenkasse, Zusatzversicherung und Leistungsbedingungen ab und ist nicht garantiert.
          </p>
        </aside>

        {/* Compare all */}
        <div className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="font-bold text-foreground">Alle Optionen im Überblick</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {PLAN_ORDER.map((k) => {
              const plan = PLANS[k]
              const isSel = k === activePlan
              const isRec = k === recommended
              return (
                <article
                  key={k}
                  className={`flex flex-col rounded-xl border p-4 transition-colors ${
                    isSel ? "border-primary ring-1 ring-primary" : "border-border"
                  }`}
                >
                  <h3 className="text-sm font-bold text-foreground">
                    {plan.name}
                    {isRec ? <span className="ml-1 text-xs font-semibold text-primary">· empfohlen</span> : null}
                  </h3>
                  <p className="mt-1 text-base font-bold tabular-nums text-foreground">{formatCHF(plan.annual)}</p>
                  <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">{plan.desc}</p>
                  <button
                    type="button"
                    onClick={() => setSelected(k)}
                    className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      isSel ? "bg-primary text-primary-foreground" : "border border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {isSel ? "Ausgewählt" : "Diese Variante wählen"}
                  </button>
                </article>
              )
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {selected && selected !== recommended ? (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Empfehlung wiederherstellen
              </button>
            ) : null}
            <a
              href="https://combinvest.payrexx.com/pay?tid=c79a5502"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep"
            >
              Paket ansehen
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="https://apps.apple.com/ch/app/mysealth/id1569941928"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              MySealth App
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

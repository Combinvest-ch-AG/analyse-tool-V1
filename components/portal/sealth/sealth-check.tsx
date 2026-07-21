"use client"

import { useMemo, useState } from "react"
import { Check, ArrowRight, ArrowLeft } from "lucide-react"
import { formatCHF } from "@/lib/format"
import { CalcActionBar } from "@/components/portal/rechner/calc-action-bar"

type Dim = "wealth" | "health" | "self" | "legal" | "app"
type Question = { c: string; d: Dim | "priority"; q: string; o: [number, string][] }
type PlanKey = "coach" | "tax" | "protect" | "sealth" | "premium"
type Plan = { name: string; annual: number; monthly: number; desc: string; benefits: string[] }

const QUESTIONS: Question[] = [
  { c: "WEALTH", d: "wealth", q: "Wie möchten Sie Ihre Steuererklärung künftig erledigen?", o: [[0, "Selbstständig – ich brauche keine Hilfe"], [2, "Digital unterstützt und kontrolliert"], [4, "Möglichst vollständig durch einen Profi"]] },
  { c: "WEALTH", d: "wealth", q: "Wie wichtig ist Ihnen ein persönlicher Finanzcoach?", o: [[0, "Aktuell nicht wichtig"], [2, "Bei wichtigen Entscheidungen"], [4, "Regelmässige Begleitung wäre wertvoll"]] },
  { c: "WEALTH", d: "wealth", q: "Wie viel Unterstützung wünschen Sie bei Versicherungen und Schadenfällen?", o: [[0, "Keine – ich erledige alles selbst"], [2, "Verträge gelegentlich prüfen"], [4, "Treuhand, Formulare und Schadenmanagement aus einer Hand"]] },
  { c: "HEALTH", d: "health", q: "Wie nutzen Sie Fitness-, Sport- oder Wellnessangebote?", o: [[0, "Kaum oder gar nicht"], [2, "Ein einzelnes Fitnesscenter genügt"], [4, "Mehrere Sportarten, Wellness oder verschiedene Orte"]] },
  { c: "HEALTH", d: "health", q: "Wie häufig würden Sie ein flexibles Sport- und Wellnessnetzwerk nutzen?", o: [[0, "Seltener als monatlich"], [2, "Ein- bis zweimal pro Woche"], [4, "Mehrmals pro Woche"]] },
  { c: "SELF", d: "self", q: "Welche Rolle spielen persönliche Entwicklung, Videos und Seminare für Sie?", o: [[0, "Derzeit keine"], [2, "Gelegentliche Impulse"], [4, "Ich möchte mich aktiv weiterentwickeln"]] },
  { c: "SCHUTZ", d: "legal", q: "Wie wichtig ist Ihnen privater Rechtsschutz?", o: [[0, "Nicht benötigt oder bereits vollständig gedeckt"], [2, "Ich möchte meine Situation prüfen"], [4, "Eine integrierte Rechtsschutzlösung ist mir wichtig"]] },
  { c: "DIGITAL", d: "app", q: "Wie wichtig ist ein digitales Cockpit für Verträge, Beraterkontakt und Finanzübersicht?", o: [[0, "Nicht wichtig"], [2, "Praktisch, aber nicht entscheidend"], [4, "Sehr wichtig – ich möchte alles zentral sehen"]] },
  { c: "PRIORITÄT", d: "priority", q: "Welcher Bereich soll für Sie zuerst verbessert werden?", o: [[1, "Steuern und Administration"], [2, "Finanzen und Versicherungen"], [3, "Gesundheit und Fitness"], [4, "Alles kombiniert"]] },
]

const PLANS: Record<PlanKey, Plan> = {
  coach: { name: "Sealth Coach", annual: 150, monthly: 12.5, desc: "App und persönliches Basis-Coaching.", benefits: ["MySealth App", "Persönliches Basis-Coaching", "Videos & Seminare"] },
  tax: { name: "Sealth Tax Assist", annual: 220, monthly: 19.9, desc: "Steuererklärung, App und Coaching.", benefits: ["Steuererklärung vom Profi", "MySealth App", "Coaching sowie Videos & Seminare"] },
  protect: { name: "Sealth Protect", annual: 597, monthly: 59, desc: "Wealth-Service mit integriertem Rechtsschutz.", benefits: ["Finanzcoaching und Steuererklärung", "Versicherungstreuhand und Schadenmanager", "Rechtsschutz (Dextra)", "Basis-Fitness in selektierten Centern", "MySealth App"] },
  sealth: { name: "Sealth", annual: 897, monthly: 79.9, desc: "Wealth-Service und umfassende Health-Leistungen.", benefits: ["Finanzcoaching und Steuererklärung", "Versicherungstreuhand und Schadenmanager", "Fitpass: Partnernetzwerk, Sport & Wellness", "Unlimitierte Flatrate", "MySealth App"] },
  premium: { name: "Sealth Premium", annual: 997, monthly: 87, desc: "Wealth, Health, Self und Rechtsschutz vereint.", benefits: ["Alle Wealth-Leistungen", "Fitpass Health-Angebot", "Rechtsschutz (Dextra)", "Videos & Seminare", "MySealth App"] },
}

const PLAN_ORDER: PlanKey[] = ["coach", "tax", "protect", "sealth", "premium"]

function pct(v: number, max: number) {
  return Math.round((v / max) * 100) + "%"
}
function priceMonthly(n: number) {
  return "CHF " + n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function healthEligible(k: PlanKey) {
  return k === "protect" || k === "sealth" || k === "premium"
}

export function SealthCheck({ ctx }: { ctx: { analysisId?: string; customerId?: string } }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null))
  const [done, setDone] = useState(false)
  const [selected, setSelected] = useState<PlanKey | null>(null)

  // scenario inputs
  const [taxCost, setTaxCost] = useState(250)
  const [fitnessCost, setFitnessCost] = useState(90)
  const [legalCost, setLegalCost] = useState(300)
  const [timeValue, setTimeValue] = useState(300)
  const [healthRefund, setHealthRefund] = useState(200)

  const scores = useMemo(() => {
    const s: Record<Dim, number> = { wealth: 0, health: 0, self: 0, legal: 0, app: 0 }
    QUESTIONS.forEach((q, x) => {
      if (q.d !== "priority") s[q.d] += answers[x] ?? 0
    })
    return s
  }, [answers])

  const recommended = useMemo<PlanKey>(() => {
    const priority = answers[8]
    if (scores.wealth <= 2 && scores.health === 0 && scores.legal === 0) return (answers[0] ?? 0) >= 2 ? "tax" : "coach"
    if (scores.health >= 5 && scores.legal >= 3) return "premium"
    if (priority === 4 && scores.health >= 3) return scores.legal >= 2 ? "premium" : "sealth"
    if (scores.health >= 4) return "sealth"
    if (scores.legal >= 3) return "protect"
    if ((answers[0] ?? 0) >= 3) return "tax"
    return "coach"
  }, [answers, scores])

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

  function selectAnswer(v: number) {
    const next = [...answers]
    next[step] = v
    setAnswers(next)
  }

  function goNext() {
    if (answers[step] == null) return
    if (step < QUESTIONS.length - 1) setStep(step + 1)
    else setDone(true)
  }

  const payload = {
    answers,
    scores,
    recommendation: recommended,
    selectedPackage: activePlan,
    annualPrice: PLANS[activePlan].annual,
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

  if (!done) {
    const q = QUESTIONS[step]
    return (
      <div className="mx-auto max-w-2xl">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(step / QUESTIONS.length) * 100}%` }} />
        </div>
        <div className="mt-4 flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span className="uppercase tracking-wide">{q.c}</span>
          <span>
            {step + 1} / {QUESTIONS.length}
          </span>
        </div>
        <h2 className="mt-3 text-pretty text-xl font-bold text-foreground">{q.q}</h2>
        <div className="mt-4 grid gap-2">
          {q.o.map(([val, label]) => {
            const on = answers[step] === val
            return (
              <button
                key={label}
                type="button"
                onClick={() => selectAnswer(val)}
                aria-pressed={on}
                className={`rounded-xl border px-4 py-3.5 text-left text-sm font-semibold transition-colors ${
                  on ? "border-primary bg-primary/5 text-primary ring-1 ring-primary" : "border-border bg-background text-foreground hover:border-primary/40"
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> Zurück
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={answers[step] == null}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-50"
          >
            {step === QUESTIONS.length - 1 ? "Empfehlung anzeigen" : "Weiter"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  const p = PLANS[activePlan]
  const benefitList = [...p.benefits]
  if (healthEligible(activePlan)) benefitList.push("Bestätigungsdokument für mögliche Krankenkassen-Rückerstattung")
  const dims: [string, string][] = [
    ["Wealth", pct(scores.wealth, 12)],
    ["Health", pct(scores.health, 8)],
    ["Self", pct(scores.self, 4)],
    ["Schutz", pct(scores.legal, 4)],
  ]

  return (
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
            ? "Dieses Paket passt gemäss Bedarfscheck am besten."
            : "Diese Variante wurde alternativ zur persönlichen Empfehlung ausgewählt."}
        </p>

        <div className="mt-4 grid grid-cols-4 gap-2">
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
          <button
            type="button"
            onClick={() => {
              setDone(false)
              setStep(QUESTIONS.length - 1)
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Antworten bearbeiten
          </button>
          <CalcActionBar
            ctx={ctx}
            calcKey="sealth-check"
            buildPayload={() => payload}
            onReset={() => {
              setDone(false)
              setStep(0)
              setSelected(null)
              setAnswers(Array(QUESTIONS.length).fill(null))
            }}
          />
        </div>
      </div>
    </div>
  )
}

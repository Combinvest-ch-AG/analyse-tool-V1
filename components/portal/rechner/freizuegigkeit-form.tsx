"use client"

import { useMemo, useState } from "react"
import { formatCHF } from "@/lib/format"
import { CalcActionBar, type CalcContext, type SavedCalculatorPayload } from "@/components/portal/rechner/calc-action-bar"

type Form = {
  reason: string
  solution: string
  pensionFund: string
  amount: string
  exitDate: string
  priority: string
  notes: string
}

const EMPTY: Form = {
  reason: "",
  solution: "Freizügigkeitskonto",
  pensionFund: "",
  amount: "",
  exitDate: "",
  priority: "Normal",
  notes: "",
}

const REASONS = [
  "Arbeitgeberwechsel",
  "Austritt ohne neue Pensionskasse",
  "Selbstständigkeit",
  "Aufteilung Scheidung",
  "Andere Situation",
]
const SOLUTIONS = ["Freizügigkeitskonto", "Freizügigkeitsdepot", "Beratung erforderlich"]
const PRIORITIES = ["Normal", "Dringend", "Termin offen"]

const SELECT =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
const INPUT = SELECT

const SUMMARY_LABELS: { key: keyof Form; label: string }[] = [
  { key: "reason", label: "Grund" },
  { key: "solution", label: "Lösung" },
  { key: "pensionFund", label: "Bisherige PK" },
  { key: "amount", label: "Guthaben" },
  { key: "exitDate", label: "Austritt" },
  { key: "priority", label: "Priorität" },
]

export function FreizuegigkeitForm({ ctx, saved }: { ctx: CalcContext; saved?: SavedCalculatorPayload }) {
  const restored = Object.fromEntries(
    (Object.keys(EMPTY) as (keyof Form)[]).map((key) => [key, typeof saved?.[key] === "string" ? saved[key] : EMPTY[key]]),
  ) as Form
  const [form, setForm] = useState<Form>(restored)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((s) => ({ ...s, [k]: v }))

  const summary = useMemo(
    () =>
      SUMMARY_LABELS.map(({ key, label }) => {
        let value: string = form[key] || "—"
        if (key === "amount" && form.amount) value = formatCHF(Number(form.amount) || 0)
        return { label, value }
      }),
    [form],
  )

  return (
    <>
      <CalcActionBar ctx={ctx} calcKey="freizuegigkeit" buildPayload={() => ({ ...form })} onReset={() => setForm(EMPTY)} />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Form */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-1.5">
            <span className="h-1.5 w-6 rounded-full bg-primary" />
            <span className="h-1.5 w-6 rounded-full bg-border" />
            <span className="h-1.5 w-6 rounded-full bg-border" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Ausgangslage erfassen</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Noch keine Kontoeröffnung und keine Übermittlung an einen Anbieter – nur der Auftragsentwurf.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-foreground">Grund der Freizügigkeit</span>
              <select className={`mt-1.5 ${SELECT}`} value={form.reason} onChange={(e) => set("reason", e.target.value)}>
                <option value="">Bitte wählen</option>
                {REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-foreground">Gewünschte Lösung</span>
              <select className={`mt-1.5 ${SELECT}`} value={form.solution} onChange={(e) => set("solution", e.target.value)}>
                {SOLUTIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-foreground">Bisherige Pensionskasse</span>
              <input
                className={`mt-1.5 ${INPUT}`}
                value={form.pensionFund}
                onChange={(e) => set("pensionFund", e.target.value)}
                placeholder="Vorsorgeeinrichtung"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-foreground">Voraussichtliches Guthaben</span>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  CHF
                </span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  className={`${INPUT} pl-11 tabular-nums`}
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  placeholder="0"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-foreground">Austrittsdatum</span>
              <input
                type="date"
                className={`mt-1.5 ${INPUT}`}
                value={form.exitDate}
                onChange={(e) => set("exitDate", e.target.value)}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-foreground">Priorität</span>
              <select className={`mt-1.5 ${SELECT}`} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {PRIORITIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold text-foreground">Bemerkungen</span>
              <textarea
                className={`mt-1.5 ${INPUT} min-h-20 resize-y`}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Wünsche oder fehlende Unterlagen"
              />
            </label>
          </div>

          <p className="mt-4 rounded-xl bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            Vor dem späteren Versand werden Identität und Unterlagen geprüft. Der Entwurf wird mit der Kundenanalyse
            gespeichert.
          </p>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Auftragsübersicht</p>
            <dl className="mt-4 divide-y divide-border">
              {summary.map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-4 py-2.5">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="text-right text-sm font-semibold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-3 px-1 text-xs leading-relaxed text-muted-foreground">
            Die Freizügigkeit gehört fachlich zum Vermögensaufbau. Nach Anbindung des Anbieters kann der Auftrag direkt
            übermittelt werden.
          </p>
        </div>
      </div>
    </>
  )
}

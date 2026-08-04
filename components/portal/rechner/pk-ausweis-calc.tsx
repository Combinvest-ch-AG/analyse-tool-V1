"use client"

import { useMemo, useState } from "react"
import { formatCHF } from "@/lib/format"
import { CalcActionBar, type CalcContext, type SavedCalculatorPayload } from "@/components/portal/rechner/calc-action-bar"

type FieldKey = "insuredSalary" | "capital" | "iv" | "ivChild" | "partner" | "orphan"

const FIELDS: { key: FieldKey; label: string; hint: string }[] = [
  { key: "insuredSalary", label: "Versicherter Lohn", hint: "Koordinierter Lohn gemäss Ausweis" },
  { key: "capital", label: "Altersguthaben", hint: "Aktuelles Sparkapital (BVG + überobligatorisch)" },
  { key: "iv", label: "IV-Rente pro Jahr", hint: "Invalidenrente aus der Pensionskasse" },
  { key: "ivChild", label: "IV-Kinderrente pro Kind", hint: "Ergänzung je Kind bei Invalidität" },
  { key: "partner", label: "Partnerrente pro Jahr", hint: "Hinterlassenenrente für Partner:in" },
  { key: "orphan", label: "Waisenrente pro Kind", hint: "Rente je Kind im Todesfall" },
]

export function PkAusweisCalc({ ctx, saved }: { ctx?: CalcContext; saved?: SavedCalculatorPayload }) {
  const [values, setValues] = useState<Record<FieldKey, string>>({
    insuredSalary: saved?.insuredSalary ? String(saved.insuredSalary) : "",
    capital: saved?.capital ? String(saved.capital) : "",
    iv: saved?.iv ? String(saved.iv) : "",
    ivChild: saved?.ivChild ? String(saved.ivChild) : "",
    partner: saved?.partner ? String(saved.partner) : "",
    orphan: saved?.orphan ? String(saved.orphan) : "",
  })

  const set = (k: FieldKey, v: string) => setValues((s) => ({ ...s, [k]: v }))
  const num = (k: FieldKey) => Number(values[k]) || 0

  const filled = useMemo(() => FIELDS.filter((f) => num(f.key) > 0).length, [values])

  return (
    <>
      <CalcActionBar
        ctx={ctx ?? {}}
        calcKey="pk-ausweis"
        buildPayload={() => ({
          ...Object.fromEntries(FIELDS.map((f) => [f.key, num(f.key)])),
          filledFields: filled,
        })}
        onReset={() =>
          setValues({ insuredSalary: "", capital: "", iv: "", ivChild: "", partner: "", orphan: "" })
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Form */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Angaben aus dem Vorsorgeausweis
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="text-sm font-semibold text-foreground">{f.label}</span>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  CHF
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={values[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-11 pr-3 text-sm tabular-nums text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">{f.hint}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Zusammenfassung</p>

          <dl className="mt-4 divide-y divide-border">
            {FIELDS.map((f) => (
              <div key={f.key} className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-muted-foreground">{f.label}</dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">
                  {num(f.key) > 0 ? formatCHF(num(f.key)) : "—"}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 rounded-xl bg-muted/50 p-4">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{filled} von {FIELDS.length}</span> Feldern erfasst. Diese Werte
              dienen als Grundlage für die Vorsorgelückenanalyse.
            </p>
          </div>
        </div>

        <p className="mt-3 px-1 text-xs leading-relaxed text-muted-foreground">
          Übertragen Sie die Werte direkt aus dem aktuellen Vorsorgeausweis der Pensionskasse. Massgeblich ist stets das
          Originaldokument.
        </p>
      </div>
      </div>
    </>
  )
}

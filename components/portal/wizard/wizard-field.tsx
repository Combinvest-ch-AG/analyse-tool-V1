"use client"

import { useState } from "react"
import { RotateCcw } from "lucide-react"
import type { DetailField, Question, WizardAnswers } from "@/lib/wizard/schema"
import { computeNetSalary, AHV_IV_EO_RATE, ALV_RATE } from "@/lib/engine/salary"
import { formatCHF } from "@/lib/format"

export function WizardField({
  question,
  value,
  answers,
  onChange,
  onDetailChange,
}: {
  question: Question
  value: WizardAnswers[string]
  answers: WizardAnswers
  onChange: (value: WizardAnswers[string]) => void
  onDetailChange: (key: string, value: WizardAnswers[string]) => void
}) {
  const q = question

  return (
    <div className="space-y-5">
      {q.type === "single" ? (
        <OptionButtons options={q.opts ?? []} selected={typeof value === "string" ? [value] : []} onToggle={onChange} />
      ) : null}

      {q.type === "multi" ? (
        <OptionButtons
          options={q.opts ?? []}
          selected={Array.isArray(value) ? value : []}
          onToggle={(val) => {
            const selected = Array.isArray(value) ? value : []
            let next: string[]
            if (q.exclusive && val === q.exclusive) {
              next = [val]
            } else {
              next = selected.filter((item) => item !== q.exclusive)
              next = next.includes(val) ? next.filter((item) => item !== val) : [...next, val]
            }
            onChange(next)
          }}
          multiple
        />
      ) : null}

      {q.type === "slider" ? (
        <>
          <SliderField question={q} value={value} onChange={onChange} />
          {q.salaryNet ? (
            <SalaryNetPanel annualGross={typeof value === "number" ? value : 0} answers={answers} onChange={onDetailChange} />
          ) : null}
        </>
      ) : null}

      {q.type === "text" ? (
        <input
          type="text"
          inputMode={q.inputmode === "numeric" ? "numeric" : "text"}
          maxLength={q.maxlength}
          placeholder={q.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full max-w-md rounded-xl border border-border bg-card px-3.5 py-3 text-base font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
        />
      ) : null}

      <DetailFields question={q} answers={answers} onChange={onDetailChange} />
    </div>
  )
}

function OptionButtons({
  options,
  selected,
  onToggle,
  multiple = false,
}: {
  options: [string, string][]
  selected: string[]
  onToggle: (value: string) => void
  multiple?: boolean
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {options.map(([val, label]) => {
        const pressed = selected.includes(val)
        return (
          <button
            key={val}
            type="button"
            aria-pressed={pressed}
            onClick={() => onToggle(val)}
            className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold tracking-tight transition-all ${
              pressed
                ? "border-primary bg-primary text-primary-foreground shadow-[0_3px_10px_rgba(58,87,245,0.24)]"
                : "border-border bg-secondary text-foreground hover:border-primary/60 hover:bg-primary/5"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center border ${
                multiple ? "rounded-md" : "rounded-full"
              } ${pressed ? "border-white/80 bg-white/20" : "border-border bg-card"}`}
              aria-hidden="true"
            >
              {pressed ? <span className={`block bg-current ${multiple ? "h-2 w-2 rounded-sm" : "h-2 w-2 rounded-full"}`} /> : null}
            </span>
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

function SliderField({
  question: q,
  value,
  onChange,
}: {
  question: Question
  value: WizardAnswers[string]
  onChange: (value: number) => void
}) {
  const num = typeof value === "number" ? value : (q.def ?? q.min ?? 0)
  const hasExplicitValue = typeof value === "number"
  const fmt = q.fmt ?? ((v: number) => String(v))
  const update = (raw: string) => {
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return
    onChange(Math.max(q.min ?? parsed, Math.min(q.max ?? parsed, parsed)))
  }

  return (
    <div className="rounded-2xl border border-border bg-secondary p-5">
      {q.directInput ? (
        <label className="mb-5 block">
          <span className="mb-1.5 block text-xs font-bold text-muted-foreground">Exakter Betrag</span>
          <div className="flex max-w-sm items-center overflow-hidden rounded-xl border border-border bg-card focus-within:border-primary focus-within:ring-2 focus-within:ring-ring">
            <span className="border-r border-border px-3 py-3 text-sm font-bold text-muted-foreground">CHF</span>
            <input
              type="number"
              min={q.min}
              max={q.max}
              step={q.step ?? 1}
              value={hasExplicitValue ? num : ""}
              placeholder="Betrag eingeben"
              onChange={(e) => update(e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base font-extrabold tabular-nums text-foreground outline-none"
            />
          </div>
        </label>
      ) : null}
      <input
        type="range"
        min={q.min}
        max={q.max}
        step={q.step ?? 1}
        value={num}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
        <span>{fmt(q.min ?? 0)}</span>
        <b className="text-center text-lg font-extrabold tabular-nums text-foreground">{fmt(num)}</b>
        <span className="text-right">{fmt(q.max ?? 0)}</span>
      </div>
    </div>
  )
}

function SalaryNetPanel({
  annualGross,
  answers,
  onChange,
}: {
  annualGross: number
  answers: WizardAnswers
  onChange: (key: string, value: WizardAnswers[string]) => void
}) {
  const [editing, setEditing] = useState(false)
  if (annualGross <= 0) return null

  const age = Math.max(18, Math.min(70, Number(answers.alter) || 35))
  const monthlyGross = annualGross / 12
  const b = computeNetSalary(monthlyGross, age)
  const override = typeof answers.netto === "number" ? answers.netto : null
  const isManual = override != null
  const net = isManual ? override : Math.round(b.net)

  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/[0.05] p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-extrabold tracking-tight text-foreground">Nettolohn (Schätzung)</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            isManual ? "bg-accent text-primary" : "bg-success/10 text-success"
          }`}
        >
          {isManual ? "manuell" : "automatisch"}
        </span>
      </div>

      <dl className="space-y-1.5 text-[13px]">
        <DeductionRow label="Bruttolohn / Monat" value={Math.round(b.gross)} sign="" strong />
        <DeductionRow label={`AHV / IV / EO (${(AHV_IV_EO_RATE * 100).toFixed(1)} %)`} value={Math.round(b.ahvIvEo)} sign="−" />
        <DeductionRow label={`ALV (${(ALV_RATE * 100).toFixed(1)} %)`} value={Math.round(b.alv)} sign="−" />
        <DeductionRow
          label={`BVG Pensionskasse (${(b.bvgRate * 100).toFixed(1)} %)`}
          value={Math.round(b.bvg)}
          sign="−"
          hint={b.bvgRate === 0 ? "18–24: kein Sparbeitrag" : `Alter ${age}`}
        />
      </dl>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-primary/15 pt-3">
        <span className="text-sm font-black text-foreground">Nettolohn / Monat</span>
        {editing ? (
          <div className="flex items-center gap-2">
            <div className="flex items-stretch overflow-hidden rounded-lg border border-primary/40 bg-card">
              <span className="flex items-center px-2 text-xs font-semibold text-muted-foreground">CHF</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={50}
                autoFocus
                defaultValue={net}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  onChange("netto", e.target.value === "" || !Number.isFinite(v) ? null : Math.max(0, v))
                }}
                aria-label="Nettolohn manuell eingeben"
                className="w-28 border-0 bg-transparent px-2 py-2 text-right text-sm font-black tabular-nums text-foreground outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
            >
              OK
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-lg font-black tabular-nums text-foreground">{formatCHF(net)}</span>
            {isManual ? (
              <button
                type="button"
                onClick={() => onChange("netto", null)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-primary"
              >
                <RotateCcw className="h-3 w-3" /> Auto
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
            >
              Anpassen
            </button>
          </div>
        )}
      </div>

      <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
        Automatisch aus dem Bruttolohn geschätzt (Arbeitnehmeranteile AHV/IV/EO, ALV und altersabhängiger BVG-Anteil).
        Kennen Sie den exakten Nettolohn, tippen Sie ihn direkt ein – er wird ins Budget übernommen.
      </p>
    </div>
  )
}

function DeductionRow({
  label,
  value,
  sign,
  hint,
  strong,
}: {
  label: string
  value: number
  sign: string
  hint?: string
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>
        {label}
        {hint ? <span className="ml-1 text-[11px] opacity-70">· {hint}</span> : null}
      </span>
      <span className={`tabular-nums ${strong ? "font-bold text-foreground" : ""}`}>
        {sign} {formatCHF(value)}
      </span>
    </div>
  )
}

function DetailFields({
  question,
  answers,
  onChange,
}: {
  question: Question
  answers: WizardAnswers
  onChange: (key: string, value: WizardAnswers[string]) => void
}) {
  const main = answers[question.id]
  const selected = Array.isArray(main) ? main : main == null ? [] : [String(main)]
  const visible = (question.details ?? []).filter((detail) => detail.showWhen.some((item) => selected.includes(item)))
  if (!visible.length) return null

  return (
    <div className="rounded-2xl border border-primary/15 bg-primary/[0.035] p-4">
      <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-primary">Details zur Antwort</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((detail) => (
          <DetailInput key={detail.id} detail={detail} answers={answers} onChange={onChange} />
        ))}
      </div>
    </div>
  )
}

function DetailInput({
  detail,
  answers,
  onChange,
}: {
  detail: DetailField
  answers: WizardAnswers
  onChange: (key: string, value: WizardAnswers[string]) => void
}) {
  const value = answers[detail.id]

  if (detail.type === "ages") {
    const count = Math.max(0, Math.min(12, Number(answers[detail.countFrom ?? ""]) || 0))
    const values = Array.isArray(value) ? value : []
    return (
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-bold text-foreground">
          {detail.label}
          {detail.required ? <span className="ml-1 text-destructive">*</span> : null}
        </legend>
        {detail.hint ? <p className="mt-0.5 text-xs text-muted-foreground">{detail.hint}</p> : null}
        {count > 0 ? (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: count }, (_, index) => (
              <label key={index}>
                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Kind {index + 1}</span>
                <div className="flex items-center overflow-hidden rounded-xl border border-border bg-card focus-within:border-primary focus-within:ring-2 focus-within:ring-ring">
                  <input
                    type="number"
                    min={detail.min}
                    max={detail.max}
                    value={values[index] ?? ""}
                    onChange={(e) => {
                      const next = Array.from({ length: count }, (_, i) => values[i] ?? "")
                      next[index] = e.target.value
                      onChange(detail.id, next)
                    }}
                    className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm font-bold text-foreground outline-none"
                    aria-label={`Alter Kind ${index + 1}`}
                  />
                  <span className="pr-3 text-xs text-muted-foreground">J.</span>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <p className="mt-2 rounded-xl border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
            Zuerst die Anzahl Kinder eintragen.
          </p>
        )}
      </fieldset>
    )
  }

  return (
    <label className={detail.id === "tabak_details" ? "sm:col-span-2" : ""}>
      <span className="mb-1.5 block text-sm font-bold text-foreground">
        {detail.label}
        {detail.required ? <span className="ml-1 text-destructive">*</span> : null}
      </span>
      <input
        type={detail.type === "number" ? "number" : "text"}
        inputMode={detail.type === "number" ? "numeric" : "text"}
        min={detail.min}
        max={detail.max}
        placeholder={detail.placeholder}
        value={typeof value === "number" || typeof value === "string" ? value : ""}
        onChange={(e) => onChange(detail.id, detail.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)}
        className="w-full rounded-xl border border-border bg-card px-3.5 py-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
      />
      {detail.hint ? <span className="mt-1 block text-xs text-muted-foreground">{detail.hint}</span> : null}
    </label>
  )
}

"use client"

import type { Question } from "@/lib/wizard/schema"
import { RELEVANCE_LABELS } from "@/lib/wizard/schema"

type Value = string | number | string[] | null

export function WizardField({
  question,
  value,
  onChange,
}: {
  question: Question
  value: Value
  onChange: (v: Value) => void
}) {
  const q = question

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3">
        <label className="text-sm font-semibold text-foreground">{q.label}</label>
        {q.help && <p className="mt-0.5 text-xs text-muted-foreground">{q.help}</p>}
      </div>

      {q.type === "radio" && (
        <div className="flex flex-wrap gap-2">
          {q.options!.map((o) => {
            const active = value === o.value
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange(o.value)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:border-primary/40"
                }`}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      )}

      {q.type === "select" && (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
        >
          <option value="">Bitte wählen …</option>
          {q.options!.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {q.type === "date" && (
        <input
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
      )}

      {(q.type === "currency" || q.type === "number") && (
        <div className="flex items-center gap-2">
          {q.type === "currency" && <span className="text-sm font-semibold text-muted-foreground">CHF</span>}
          <input
            type="number"
            inputMode="numeric"
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
          {q.suffix && q.type !== "currency" && (
            <span className="whitespace-nowrap text-sm text-muted-foreground">{q.suffix}</span>
          )}
        </div>
      )}

      {q.type === "relevance" && (
        <RelevanceSlider value={(value as number) ?? 0} onChange={(n) => onChange(n)} />
      )}

      {q.type === "scale" && (
        <ScaleSlider
          value={(value as number) ?? q.min ?? 1}
          min={q.min ?? 1}
          max={q.max ?? 10}
          step={q.step ?? 1}
          suffix={q.suffix}
          onChange={(n) => onChange(n)}
        />
      )}

      {q.type === "multiselect" && (
        <div className="flex flex-wrap gap-2">
          {q.options!.map((o) => {
            const arr = Array.isArray(value) ? (value as string[]) : []
            const active = arr.includes(o.value)
            return (
              <button
                key={o.value}
                type="button"
                onClick={() =>
                  onChange(active ? arr.filter((v) => v !== o.value) : [...arr, o.value])
                }
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:border-primary/40"
                }`}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RelevanceSlider({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const active = value >= n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-label={`Relevanz ${n}`}
              className={`h-9 flex-1 rounded-lg border text-sm font-bold transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40"
              }`}
            >
              {n}
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-xs font-semibold text-muted-foreground">
        {value > 0 ? RELEVANCE_LABELS[value] : "Noch nicht bewertet"}
      </p>
    </div>
  )
}

function ScaleSlider({
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  value: number
  min: number
  max: number
  step: number
  suffix?: string
  onChange: (n: number) => void
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-primary"
      />
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

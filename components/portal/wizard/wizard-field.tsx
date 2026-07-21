"use client"

import type { Question, WizardAnswers } from "@/lib/wizard/schema"

export function WizardField({
  question,
  value,
  onChange,
}: {
  question: Question
  value: WizardAnswers[string]
  onChange: (value: WizardAnswers[string]) => void
}) {
  const q = question

  if (q.type === "single") {
    return (
      <div className="flex flex-wrap gap-2.5">
        {(q.opts ?? []).map(([val, label]) => {
          const pressed = value === val
          return (
            <button
              key={val}
              type="button"
              aria-pressed={pressed}
              onClick={() => onChange(val)}
              className={`rounded-xl border px-4 py-3 text-sm font-bold tracking-tight transition-colors ${
                pressed
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_3px_10px_rgba(58,87,245,0.32)]"
                  : "border-border bg-secondary text-foreground hover:border-primary"
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    )
  }

  if (q.type === "multi") {
    const selected = Array.isArray(value) ? value : []
    const toggle = (val: string) => {
      let next: string[]
      if (q.exclusive && val === q.exclusive) {
        next = [val]
      } else {
        next = selected.filter((v) => v !== q.exclusive)
        next = next.includes(val) ? next.filter((v) => v !== val) : [...next, val]
      }
      onChange(next)
    }
    return (
      <div className="flex flex-wrap gap-2.5">
        {(q.opts ?? []).map(([val, label]) => {
          const pressed = selected.includes(val)
          return (
            <button
              key={val}
              type="button"
              aria-pressed={pressed}
              onClick={() => toggle(val)}
              className={`rounded-xl border px-4 py-3 text-sm font-bold tracking-tight transition-colors ${
                pressed
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_3px_10px_rgba(58,87,245,0.32)]"
                  : "border-border bg-secondary text-foreground hover:border-primary"
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    )
  }

  if (q.type === "slider") {
    const num = typeof value === "number" ? value : (q.def ?? q.min ?? 0)
    const fmt = q.fmt ?? ((v: number) => String(v))
    return (
      <div className="rounded-2xl border border-border bg-secondary p-5">
        <input
          type="range"
          min={q.min}
          max={q.max}
          step={q.step ?? 1}
          value={num}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="mt-3 flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>{fmt(q.min ?? 0)}</span>
          <b className="text-lg font-extrabold text-foreground">{fmt(num)}</b>
          <span>{fmt(q.max ?? 0)}</span>
        </div>
      </div>
    )
  }

  // text
  return (
    <input
      type="text"
      inputMode={q.inputmode === "numeric" ? "numeric" : "text"}
      maxLength={q.maxlength}
      placeholder={q.placeholder}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full max-w-xs rounded-xl border border-border bg-card px-3.5 py-3 text-base font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
    />
  )
}

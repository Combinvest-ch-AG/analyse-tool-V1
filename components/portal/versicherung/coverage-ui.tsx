"use client"

import { useEffect, useRef } from "react"
import { X, Info } from "lucide-react"

export type CoverageInfo = {
  id: string
  label: string
  d: string // description
  a: string // was wird ergänzt
  w: string // darauf achten
  fixed?: boolean
}

/** Accessible info dialog mirroring the original "Was wird ergänzt / Darauf achten". */
export function InfoDialog({
  info,
  category,
  onClose,
}: {
  info: CoverageInfo | null
  category: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!info) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [info, onClose])

  if (!info) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={info.label}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div ref={ref} className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{category}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Erklärung schliessen"
            className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 className="mt-2 text-lg font-bold text-foreground">{info.label}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{info.d}</p>

        <div className="mt-4 rounded-xl bg-muted/60 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-foreground">Was wird ergänzt?</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{info.a}</p>
        </div>
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">Darauf achten</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{info.w}</p>
        </div>
      </div>
    </div>
  )
}

/** One coverage row: label + info button + "Bestehend" checkbox + "Gewünscht" toggle. */
export function CoverageRow({
  label,
  wanted,
  existing,
  fixed,
  onWanted,
  onExisting,
  onInfo,
}: {
  label: string
  wanted: boolean
  existing: boolean
  fixed?: boolean
  onWanted: (v: boolean) => void
  onExisting: (v: boolean) => void
  onInfo: () => void
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-border bg-background px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 text-sm font-semibold leading-snug text-foreground">{label}</span>
        <button
          type="button"
          onClick={onInfo}
          aria-label={`Erklärung zu ${label}`}
          className="inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Info className="h-3 w-3" />
        </button>
      </div>
      <div className="grid grid-cols-[auto_116px] items-center gap-3 sm:justify-self-end">
        <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={existing}
            onChange={(e) => onExisting(e.target.checked)}
            className="h-3.5 w-3.5 accent-muted-foreground"
          />
          Bestehend
        </label>
        <div className="grid grid-cols-[36px_72px] items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={wanted}
            aria-label={`${label} gewünscht`}
            disabled={fixed}
            onClick={() => !fixed && onWanted(!wanted)}
            className={`relative h-5 w-9 flex-none rounded-full transition-colors ${
              wanted ? "bg-primary" : "bg-border"
            } ${fixed ? "opacity-60" : ""}`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-card shadow-sm transition-transform ${
                wanted ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <span className={`w-[72px] whitespace-nowrap text-xs font-semibold ${wanted ? "text-primary" : "text-muted-foreground"}`}>
            {wanted ? "Gewünscht" : "Aus"}
          </span>
        </div>
      </div>
    </div>
  )
}

/** Section toggle header used to enable/disable a whole insurance block. */
export function SectionToggle({
  index,
  title,
  copy,
  enabled,
  existing,
  onEnabled,
  onExisting,
  onInfo,
}: {
  index: number
  title: string
  copy: string
  enabled: boolean
  existing: boolean
  onEnabled: (v: boolean) => void
  onExisting: (v: boolean) => void
  onInfo?: () => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {index}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            {onInfo && (
              <button
                type="button"
                onClick={onInfo}
                aria-label={`Erklärung zu ${title}`}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Info className="h-3 w-3" />
              </button>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
        </div>
      </div>
      <div className="ml-9 grid grid-cols-[auto_116px] items-center gap-3 sm:ml-0 sm:justify-self-end">
        <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={existing}
            onChange={(e) => onExisting(e.target.checked)}
            className="h-3.5 w-3.5 accent-muted-foreground"
          />
          Bestehend
        </label>
        <div className="grid grid-cols-[36px_72px] items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={`${title} gewünscht`}
            onClick={() => onEnabled(!enabled)}
            className={`relative h-5 w-9 flex-none rounded-full transition-colors ${enabled ? "bg-primary" : "bg-border"}`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-card shadow-sm transition-transform ${
                enabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <span className={`w-[72px] whitespace-nowrap text-xs font-semibold ${enabled ? "text-primary" : "text-muted-foreground"}`}>
            {enabled ? "Gewünscht" : "Aus"}
          </span>
        </div>
      </div>
    </div>
  )
}

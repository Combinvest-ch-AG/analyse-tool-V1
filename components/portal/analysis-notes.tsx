"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Check, Cloud, CloudOff, Loader2, NotebookPen } from "lucide-react"
import { AREAS, type AreaKey } from "@/lib/wizard/schema"
import { saveNotes } from "@/app/actions/portal"

type NoteKey = "general" | AreaKey
type SaveStatus = "idle" | "saving" | "saved" | "error"

/**
 * Topic order shown to the advisor: a free "Allgemein" note first, then one box
 * per advisory area (Gesundheit/Krankenkasse, Vorsorge, Steuervorteile, …).
 * Labels reuse the canonical AREAS names so notes stay aligned with the
 * risk-cockpit and theme pages.
 */
const TOPICS: { key: NoteKey; label: string }[] = [
  { key: "general", label: "Allgemein" },
  ...AREAS.map((a) => ({ key: a.key as NoteKey, label: a.name })),
]

function normalize(initial: Record<string, string> | undefined): Record<NoteKey, string> {
  const base = Object.fromEntries(TOPICS.map((t) => [t.key, ""])) as Record<NoteKey, string>
  if (!initial) return base
  for (const t of TOPICS) {
    const value = initial[t.key]
    if (typeof value === "string") base[t.key] = value
  }
  return base
}

export function AnalysisNotes({
  analysisId,
  initialNotes,
}: {
  analysisId: string
  initialNotes?: Record<string, string>
}) {
  const [notes, setNotes] = useState<Record<NoteKey, string>>(() => normalize(initialNotes))
  const [active, setActive] = useState<NoteKey>("general")
  const [status, setStatus] = useState<SaveStatus>("idle")

  const notesRef = useRef(notes)
  notesRef.current = notes
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Serialize writes so debounced saves never race and self-conflict on the
  // snapshot's optimistic lock version.
  const saveChain = useRef<Promise<void>>(Promise.resolve())

  const persist = useCallback(async () => {
    setStatus("saving")
    const result = await saveNotes({ analysisId, notes: notesRef.current })
    setStatus(result.ok ? "saved" : "error")
  }, [analysisId])

  // Debounced autosave whenever any note changes. A longer debounce collapses
  // rapid typing into a single write, matching the wizard's autosave cadence.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if (typeof document !== "undefined" && document.hidden) return
      saveChain.current = saveChain.current.catch(() => {}).then(() => persist())
    }, 2500)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes])

  const activeLabel = TOPICS.find((t) => t.key === active)?.label ?? ""
  const filledCount = (key: NoteKey) => notes[key].trim().length > 0

  const statusBadge = {
    idle: null,
    saving: (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Speichern…
      </span>
    ),
    saved: (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
        <Cloud className="h-3.5 w-3.5" /> Gespeichert
      </span>
    ),
    error: (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive">
        <CloudOff className="h-3.5 w-3.5" /> Nicht gespeichert
      </span>
    ),
  }[status]

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <NotebookPen className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Beratungsnotizen</h2>
            <p className="text-xs text-muted-foreground">Pro Termin und Thema getrennt festgehalten.</p>
          </div>
        </div>
        {statusBadge}
      </div>

      {/* Topic tabs */}
      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Notiz-Themen">
        {TOPICS.map((t) => {
          const isActive = t.key === active
          const filled = filledCount(t.key)
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              {t.label}
              {filled && (
                <Check className={`h-3.5 w-3.5 ${isActive ? "text-primary-foreground" : "text-primary"}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* Active topic editor */}
      <div className="mt-4">
        <label htmlFor={`note-${active}`} className="sr-only">
          Notiz zu {activeLabel}
        </label>
        <textarea
          id={`note-${active}`}
          value={notes[active]}
          onChange={(e) => setNotes((prev) => ({ ...prev, [active]: e.target.value }))}
          placeholder={`Notizen zu „${activeLabel}“ – z. B. Kundenwünsche, offene Punkte, nächste Schritte …`}
          className="min-h-40 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Wird automatisch gespeichert und ist bei diesem Termin jederzeit wieder abrufbar.
        </p>
      </div>
    </section>
  )
}

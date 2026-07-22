"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Download } from "lucide-react"
import {
  AREAS,
  RELEVANCE_LABELS,
  scores,
  type AreaKey,
  type ThemeStatus,
  type WizardAnswers,
} from "@/lib/wizard/schema"

type Filter = "all" | ThemeStatus

// Which risk areas map to an available calculator (Phase 4).
const AREA_CALCULATORS: Partial<Record<AreaKey, { base: string; label: string }>> = {
  health: { base: "/rechner/franchise", label: "Franchise vergleichen" },
  pensiongap: { base: "/rechner/vorsorge", label: "Vorsorgelücke berechnen" },
  "real-estate": { base: "/rechner/tragbarkeit", label: "Tragbarkeit prüfen" },
}

/** Builds a calculator href, prefilled with what we already know from the profiling. */
function calculatorHref(
  key: AreaKey,
  answers: WizardAnswers,
  ids: { analysisId?: string; customerId?: string },
): string | null {
  const calc = AREA_CALCULATORS[key]
  if (!calc) return null
  const params = new URLSearchParams()
  const salary = Number(answers.brutto) || 0
  const age = Number(answers.alter) || 0
  const hasChildren = answers.kinder === "ja"
  const plz = typeof answers.plz === "string" ? answers.plz : ""

  if (key === "pensiongap") {
    if (salary) params.set("salary", String(salary))
    if (age) params.set("age", String(age))
    params.set("children", hasChildren ? "2" : "0")
  } else if (key === "real-estate") {
    if (salary) params.set("income", String(salary))
  } else if (key === "health") {
    if (plz) params.set("plz", plz)
    if (age) params.set("birthYear", String(new Date().getFullYear() - age))
  }
  // Carry the analysis context so "In Analyse übernehmen" can write back.
  if (ids.analysisId) params.set("aid", ids.analysisId)
  if (ids.customerId) params.set("cid", ids.customerId)
  const qs = params.toString()
  return qs ? `${calc.base}?${qs}` : calc.base
}

const STATUS_LABELS: Record<ThemeStatus, string> = {
  open: "Offen",
  progress: "In Bearbeitung",
  done: "Abgeschlossen",
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "open", label: "Offen" },
  { key: "progress", label: "In Arbeit" },
  { key: "done", label: "Erledigt" },
]

export function RiskCockpit({
  answers,
  themeStatus,
  onStatusChange,
  analysisId,
  customerId,
}: {
  answers: WizardAnswers
  themeStatus: Record<string, ThemeStatus>
  onStatusChange: (key: AreaKey, status: ThemeStatus) => void
  analysisId?: string
  customerId?: string
}) {
  const [filter, setFilter] = useState<Filter>("all")
  const s = useMemo(() => scores(answers), [answers])
  const statusOf = (key: string): ThemeStatus => themeStatus[key] ?? "open"

  const ranked = useMemo(() => {
    return AREAS.map((a) => ({ a, v: s[a.key] }))
      .sort((x, y) => y.v - x.v)
      .map((item, i) => ({ ...item, rank: i + 1 }))
  }, [s])

  const done = AREAS.filter((a) => statusOf(a.key) === "done").length
  const open = AREAS.filter((a) => statusOf(a.key) === "open").length
  const high = AREAS.filter((a) => s[a.key] >= 4).length

  const visible = ranked.filter((item) => filter === "all" || statusOf(item.a.key) === filter)

  return (
    <div>
      {/* Header + report export */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-foreground">Risikoanalyse & Handlungsfelder</h2>
          <p className="text-[13px] text-muted-foreground">
            Nach Relevanz sortiert. Öffnen Sie die passenden Rechner oder erstellen Sie den Beratungsbericht.
          </p>
        </div>
        {analysisId ? (
          <a
            href={`/analyse/${analysisId}/report.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2.5 text-[13px] font-extrabold text-primary-foreground transition-colors hover:bg-primary-deep"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            PDF-Beratungsbericht
          </a>
        ) : null}
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <div className="rounded-2xl border border-border bg-card p-4">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">Fortschritt</span>
          <strong className="mt-1 mb-2.5 block text-[13px] text-foreground">
            {done} von {AREAS.length} Bereichen abgeschlossen
          </strong>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(done / AREAS.length) * 100}%` }}
            />
          </div>
        </div>
        <Stat label="Hoch relevant" value={high} />
        <Stat label="Noch offen" value={open} />
        <div className="flex items-center gap-1 rounded-2xl border border-border bg-card p-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-2.5 py-2 text-[10px] font-extrabold uppercase tracking-wide transition-colors ${
                filter === f.key ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {visible.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-secondary/50 px-4 py-8 text-center text-sm text-muted-foreground">
          In dieser Ansicht sind aktuell keine Bereiche vorhanden.
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ a, v, rank }) => {
            const st = statusOf(a.key)
            return (
              <article key={a.key} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div
                  className="relative flex h-36 flex-col justify-between bg-cover bg-center p-3"
                  style={{ backgroundImage: `url("${a.image}")` }}
                  role="img"
                  aria-label={`Bild zum Thema ${a.name}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[rgba(15,27,54,0.72)] via-[rgba(58,87,245,0.36)] to-transparent" />
                  <div className="relative flex items-start justify-between">
                    <span className="rounded-md bg-black/35 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">
                      Priorität {rank}
                    </span>
                    <span className="rounded-md bg-white/90 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-foreground">
                      {st === "done" ? "✓ " : ""}
                      {STATUS_LABELS[st]}
                    </span>
                  </div>
                  <div className="relative text-white">
                    <b className="block text-sm font-extrabold uppercase tracking-wide">{RELEVANCE_LABELS[v]}</b>
                    <small className="text-[11px] opacity-90">{v} von 5 · Relevanz</small>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-base font-extrabold text-foreground">{a.name}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{a.recommendation}</p>
                  <small className="mt-2 block text-[11px] text-muted-foreground/80">
                    Aus den Angaben im Profiling abgeleitet.
                  </small>

                  <label className="mt-4 block">
                    <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                      Bearbeitungsstatus
                    </span>
                    <select
                      value={st}
                      onChange={(e) => onStatusChange(a.key, e.target.value as ThemeStatus)}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
                    >
                      <option value="open">Offen</option>
                      <option value="progress">In Bearbeitung</option>
                      <option value="done">Abgeschlossen</option>
                    </select>
                  </label>

                  <div className="mt-4 grid gap-2">
                    {analysisId ? (
                      <Link
                        href={`/analyse/${analysisId}/thema/${a.key}`}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary-deep"
                      >
                        Bereich öffnen
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    ) : null}
                    {(() => {
                      const href = calculatorHref(a.key, answers, { analysisId, customerId })
                      const calc = AREA_CALCULATORS[a.key]
                      if (!href || !calc) return null
                      return (
                        <Link
                          href={href}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                        >
                          {calc.label}
                          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      )
                    })()}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid content-center rounded-2xl border border-border bg-card px-4 py-3">
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">{label}</span>
      <b className="mt-0.5 text-2xl text-foreground">{value}</b>
    </div>
  )
}

"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search, ArrowRight, LineChart } from "lucide-react"
import type { AnalysisStatus } from "@/lib/data/portal"
import { initials, fullName, formatDate } from "@/lib/format"

export type AnalysisListItem = {
  id: string
  customerId: string
  customerFirst: string | null
  customerLast: string | null
  status: AnalysisStatus
  currentStep: number | null
  progress: number
  updatedAt: string
}

type Filter = "all" | "open" | "completed"

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "open", label: "Offen" },
  { key: "completed", label: "Abgeschlossen" },
]

const STATUS_META: Record<AnalysisStatus, { label: string; cls: string }> = {
  draft: { label: "Entwurf", cls: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Bearbeitung", cls: "bg-[#fff5df] text-[#9c6105]" },
  completed: { label: "Abgeschlossen", cls: "bg-[#e7f8f0] text-[#08784a]" },
  cancelled: { label: "Abgebrochen", cls: "bg-muted text-muted-foreground" },
}

export function AnalysesList({ analyses }: { analyses: AnalysisListItem[] }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return analyses.filter((a) => {
      if (filter === "open" && !(a.status === "draft" || a.status === "in_progress")) return false
      if (filter === "completed" && a.status !== "completed") return false
      if (!q) return true
      return fullName(a.customerFirst, a.customerLast).toLowerCase().includes(q)
    })
  }, [analyses, query, filter])

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Analyse suchen – Kundenname …"
            aria-label="Analyse suchen"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
          />
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === f.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {analyses.length === 0 ? (
        <Empty title="Noch keine Analysen" desc="Starten Sie eine Analyse aus einem Kundenprofil heraus." />
      ) : filtered.length === 0 ? (
        <Empty title="Keine Treffer" desc="Passen Sie Suche oder Filter an." />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((a) => {
            const meta = STATUS_META[a.status]
            return (
              <Link
                key={a.id}
                href={`/kunde/${a.customerId}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                  {initials(a.customerFirst, a.customerLast)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {fullName(a.customerFirst, a.customerLast)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Schritt {a.currentStep ?? 1} · {a.progress.toFixed(0)} % · {formatDate(a.updatedAt)}
                  </p>
                </div>
                <span className={`hidden flex-none rounded-full px-2.5 py-1 text-[10px] font-bold sm:inline ${meta.cls}`}>
                  {meta.label}
                </span>
                <ArrowRight className="h-4 w-4 flex-none text-muted-foreground" aria-hidden="true" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Empty({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/30 px-5 py-14 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <LineChart className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}

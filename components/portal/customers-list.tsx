"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search, ArrowRight, Users } from "lucide-react"
import type { CustomerRow } from "@/lib/data/portal"
import { initials, fullName } from "@/lib/format"

type CustomerWithMeta = CustomerRow & { hasAnalysis: boolean }

export function CustomersList({ customers }: { customers: CustomerWithMeta[] }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => {
      const haystack = [c.first_name, c.last_name, c.email, c.phone, c.city, c.postcode]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [customers, query])

  return (
    <div>
      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Kunde suchen – Name, E-Mail, Ort …"
          aria-label="Kunde suchen"
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
        />
      </div>

      {customers.length === 0 ? (
        <Empty
          title="Noch keine Kunden"
          desc="Erfassen Sie Ihren ersten Kunden, um mit einer Analyse zu starten."
        />
      ) : filtered.length === 0 ? (
        <Empty title="Keine Treffer" desc={`Für „${query}“ wurde kein Kunde gefunden.`} />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => {
            const meta = [c.email, c.phone, [c.postcode, c.city].filter(Boolean).join(" ")]
              .filter(Boolean)
              .join(" · ")
            return (
              <Link
                key={c.id}
                href={`/kunde/${c.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                  {initials(c.first_name, c.last_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {fullName(c.first_name, c.last_name)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{meta || "Keine Kontaktdaten"}</p>
                </div>
                <span className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-primary">
                  {c.hasAnalysis ? "Profil öffnen" : "Analyse vorbereiten"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
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
        <Users className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}

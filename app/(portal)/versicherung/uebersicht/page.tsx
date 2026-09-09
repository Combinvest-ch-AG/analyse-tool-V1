import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, HeartPulse, ShieldCheck, Car, Check } from "lucide-react"
import { getAnalysis } from "@/lib/data/portal"

export const metadata: Metadata = {
  title: "Versicherungsübersicht · Combinvest",
  description: "Zentrale Übersicht der Versicherungsbereiche: Krankenzusatz, Sach- und Motorfahrzeugversicherung.",
}

type Ctx = { aid?: string; cid?: string }

const AREAS = [
  {
    key: "supplementary",
    href: "/versicherung/zusatz",
    icon: HeartPulse,
    title: "Krankenzusatzversicherung",
    desc: "Ambulante und stationäre Ergänzungen zur Grundversicherung strukturiert erfassen.",
  },
  {
    key: "property",
    href: "/versicherung/sach-motor",
    icon: ShieldCheck,
    title: "Hausrat & Privathaftpflicht",
    desc: "Bestehende Deckungen prüfen und Lücken bei Sachwerten und Haftpflicht erkennen.",
  },
  {
    key: "motor",
    href: "/versicherung/sach-motor",
    icon: Car,
    title: "Motorfahrzeugversicherung",
    desc: "Haftpflicht, Teil- und Vollkasko sowie sinnvolle Zusatzdeckungen im Blick behalten.",
  },
] as const

function withCtx(href: string, ctx: Ctx) {
  if (!ctx.aid) return href
  const q = new URLSearchParams({ aid: ctx.aid, cid: ctx.cid ?? "" })
  return `${href}?${q.toString()}`
}

export default async function VersicherungUebersichtPage({
  searchParams,
}: {
  searchParams: Promise<Ctx>
}) {
  const sp = await searchParams
  const ctx: Ctx = { aid: sp.aid, cid: sp.cid }

  let results: Record<string, unknown> = {}
  if (ctx.aid) {
    const analysis = await getAnalysis(ctx.aid)
    if (!analysis) notFound()
    results = ((analysis.latest_snapshot?.calculatorResults as Record<string, unknown>) ?? {}) as Record<string, unknown>
  }

  const done = (k: string) => Boolean(results[k])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href={ctx.aid ? `/analyse/${ctx.aid}` : "/dashboard"}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4 rotate-180" />
        {ctx.aid ? "Zurück zur Analyse" : "Zum Dashboard"}
      </Link>

      <header className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Versicherungsberatung</p>
        <h1 className="mt-1.5 text-pretty text-2xl font-bold text-foreground sm:text-3xl">
          Versicherungsübersicht
        </h1>
        <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">
          Prüfen Sie die relevanten Versicherungsbereiche Ihres Kunden strukturiert. Jeder Bereich lässt sich einzeln
          erfassen und fließt in die Analyse ein.
        </p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AREAS.map((a) => {
          const Icon = a.icon
          const complete = done(a.key)
          return (
            <Link
              key={a.title}
              href={withCtx(a.href, ctx)}
              className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                {complete ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                    <Check className="h-3 w-3" /> Erfasst
                  </span>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                    Offen
                  </span>
                )}
              </div>
              <h2 className="mt-3 font-bold text-foreground">{a.title}</h2>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{a.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                {complete ? "Erneut prüfen" : "Bedarf erfassen"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          )
        })}
      </div>

      <p className="mt-6 rounded-2xl border border-border bg-muted/40 px-5 py-3 text-xs text-muted-foreground">
        Die Erfassung dient der strukturierten Beratung und ersetzt keine Offerte. Konkrete Prämien und Bedingungen
        richten sich nach dem jeweiligen Versicherer.
      </p>
    </div>
  )
}

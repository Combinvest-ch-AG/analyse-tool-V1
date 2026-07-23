import { notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Calculator,
  Check,
  Clock,
  Coins,
  FileText,
  Gauge,
  Heart,
  Home,
  Scale,
  Shield,
  Sparkles,
  Target,
} from "lucide-react"
import { getAnalysis } from "@/lib/data/portal"
import type { AreaKey } from "@/lib/wizard/schema"
import { BUILT_ROUTES, THEME_TOOLS, THEMES, type ThemeToolIcon } from "@/lib/portal/themes"

const ICONS: Record<ThemeToolIcon, typeof Coins> = {
  coins: Coins,
  chart: BarChart3,
  scale: Scale,
  clock: Clock,
  target: Target,
  doc: FileText,
  calc: Calculator,
  gauge: Gauge,
  home: Home,
  shield: Shield,
  heart: Heart,
}

export default async function ThemaPage({
  params,
}: {
  params: Promise<{ id: string; bereich: string }>
}) {
  const { id, bereich } = await params
  const theme = THEMES[bereich as AreaKey]
  if (!theme) notFound()

  const analysis = await getAnalysis(id)
  if (!analysis) notFound()

  // Analyse-Kontext an jeden Rechner-Link anhängen, damit die Rechner wissen,
  // aus welcher Analyse sie geöffnet wurden – und "Zurück" wieder dorthin führt.
  const withCtx = (href: string) => {
    const [path, query] = href.split("?")
    const params = new URLSearchParams(query)
    params.set("aid", id)
    if (analysis.customer_id) params.set("cid", analysis.customer_id)
    return `${path}?${params.toString()}`
  }

  const tools = theme.tools.map((t) => THEME_TOOLS[t]).filter(Boolean)

  return (
    <main className="px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/analyse/${id}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zur Risikoanalyse
        </Link>

        {/* Hero band */}
        <section className="overflow-hidden rounded-2xl border border-border bg-primary/5">
          <div className="grid items-center gap-6 p-6 sm:p-8 md:grid-cols-[1fr_1.3fr]">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Persönliche Analyse</p>
              <h1 className="mt-2 text-pretty text-2xl font-extrabold text-foreground sm:text-3xl">{theme.name}</h1>
            </div>
            <div className="rounded-2xl bg-card p-6 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{theme.name}</p>
              <h2 className="mt-1.5 text-pretty text-xl font-extrabold leading-tight text-foreground">{theme.headline}</h2>
              <ul className="mt-3 grid gap-1.5">
                {theme.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm font-semibold text-foreground">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-primary" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Tools */}
        <div className="mt-8">
          <h2 className="text-xl font-extrabold text-foreground">Passende Rechner</h2>
          <p className="mt-1 text-sm text-muted-foreground">Ein individueller Blick auf Ihre persönliche Situation.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => {
              const Icon = ICONS[tool.icon]
              const path = tool.href.split("?")[0]
              const live = BUILT_ROUTES.has(path)
              const inner = (
                <>
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        live ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {live ? "Live" : "In Kürze"}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-foreground">{tool.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{tool.desc}</p>
                  <span className={`mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide ${live ? "text-primary" : "text-muted-foreground"}`}>
                    {live ? "Rechner öffnen" : "Bald verfügbar"}
                    {live && <ArrowRight className="h-3.5 w-3.5" />}
                  </span>
                </>
              )
              const cls = "block rounded-2xl border border-border bg-card p-5 text-left transition-colors"
              return live ? (
                <Link key={tool.id} href={withCtx(tool.href)} className={`${cls} hover:border-primary/40`}>
                  {inner}
                </Link>
              ) : (
                <div key={tool.id} className={`${cls} opacity-70`}>
                  {inner}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sealth inline */}
        <aside className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              <Sparkles className="h-3.5 w-3.5" /> In jeder Beratung verfügbar
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-foreground">Sealth Service-Paket prüfen</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Self, Health und Wealth passend zur persönlichen Situation kombinieren.</p>
          </div>
          <Link
            href={withCtx("/sealth")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-deep"
          >
            Bedarfscheck starten <ArrowRight className="h-4 w-4" />
          </Link>
        </aside>
      </div>
    </main>
  )
}

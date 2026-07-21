import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export function CalcShell({
  eyebrow,
  title,
  lead,
  backHref,
  backLabel,
  chip,
  explain,
  source,
  children,
}: {
  eyebrow: string
  title: string
  lead: string
  backHref: string
  backLabel: string
  chip?: string
  explain?: string
  source?: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-primary hover:text-primary-deep"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {backLabel}
        </Link>
        {chip ? (
          <span className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-bold text-muted-foreground">
            {chip}
          </span>
        ) : null}
      </div>

      <header className="mt-6 mb-7">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-pretty text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-muted-foreground">{lead}</p>
      </header>

      {children}

      {explain ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">Kurz erklärt</p>
          <h2 className="mt-1.5 text-lg font-bold text-foreground">Das zeigt das Ergebnis</h2>
          <p className="mt-2 max-w-2xl text-pretty leading-relaxed text-muted-foreground">{explain}</p>
        </section>
      ) : null}

      {source ? (
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-muted/40 px-5 py-3 text-xs text-muted-foreground">
          <span>
            <span className="font-bold text-foreground">Berechnungsgrundlage:</span> {source}
          </span>
          <span className="font-semibold">Stand 2026</span>
        </footer>
      ) : null}
    </div>
  )
}

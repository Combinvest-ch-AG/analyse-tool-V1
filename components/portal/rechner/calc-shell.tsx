import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export function CalcShell({
  eyebrow,
  title,
  lead,
  backHref,
  backLabel,
  chip,
  children,
}: {
  eyebrow: string
  title: string
  lead: string
  backHref: string
  backLabel: string
  chip?: string
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
    </div>
  )
}

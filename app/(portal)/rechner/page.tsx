import type { Metadata } from "next"
import Link from "next/link"
import { HeartPulse, PiggyBank, Home, ArrowUpRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Rechner · Combinvest",
  description: "Schweizer Finanzrechner: Vorsorgelücke, Franchise-Vergleich und Immobilien-Tragbarkeit.",
}

const CALCULATORS = [
  {
    href: "/rechner/vorsorge",
    icon: PiggyBank,
    eyebrow: "Vorsorge",
    title: "Vorsorgerechner",
    desc: "Deckungslücke bei Invalidität, Pensionierung und Todesfall — nach AHV-Skala 44 und BVG-Minimum.",
  },
  {
    href: "/rechner/franchise",
    icon: HeartPulse,
    eyebrow: "Grundversicherung",
    title: "Franchise-Vergleich",
    desc: "Alle Franchisen mit den offiziellen BAG-Prämien 2026 für Wohnort, Versicherer und Modell vergleichen.",
  },
  {
    href: "/rechner/tragbarkeit",
    icon: Home,
    eyebrow: "Wohneigentum",
    title: "Tragbarkeitsrechner",
    desc: "Prüfen, ob Kaufpreis, Eigenkapital und Einkommen nach dem Schweizer Standard zusammenpassen.",
  },
]

export default function RechnerIndexPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <header className="mb-8">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">Werkzeuge</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Rechner</h1>
        <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
          Deterministische Schweizer Finanzrechner für das Beratungsgespräch — jederzeit direkt aus der Analyse
          heraus aufrufbar.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CALCULATORS.map((c) => {
          const Icon = c.icon
          return (
            <Link
              key={c.href}
              href={c.href}
              className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                {c.eyebrow}
              </p>
              <h2 className="mt-1 flex items-center gap-1.5 text-lg font-extrabold text-foreground">
                {c.title}
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

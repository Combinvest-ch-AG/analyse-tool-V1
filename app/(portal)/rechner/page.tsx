import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowUpRight,
  Car,
  Coins,
  FileText,
  Gauge,
  HeartPulse,
  Home,
  Landmark,
  LineChart,
  ShieldCheck,
  ShieldPlus,
  Umbrella,
  Wallet,
  type LucideIcon,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Rechner · Combinvest",
  description:
    "Alle Schweizer Finanzrechner für das Beratungsgespräch: Vorsorge, Vermögen, Budget, Versicherungen und Wohneigentum.",
}

type Calc = {
  href: string
  icon: LucideIcon
  title: string
  desc: string
}

type Category = {
  key: string
  label: string
  desc: string
  items: Calc[]
}

const CATEGORIES: Category[] = [
  {
    key: "vorsorge",
    label: "Vorsorge & Pension",
    desc: "1., 2. und 3. Säule verstehen und Lücken aufdecken.",
    items: [
      {
        href: "/rechner/vorsorge",
        icon: Umbrella,
        title: "Vorsorgerechner",
        desc: "Deckungslücke bei Invalidität, Pensionierung und Todesfall – nach AHV-Skala 44 und BVG-Minimum.",
      },
      {
        href: "/rechner/ahv",
        icon: Landmark,
        title: "AHV-Rentenrechner",
        desc: "AHV-Rente mit durchschnittlichem Jahreseinkommen und Rentenskala 44 schätzen.",
      },
      {
        href: "/rechner/pk-ausweis",
        icon: FileText,
        title: "Vorsorgeausweis erfassen",
        desc: "Kennzahlen aus dem PK-Ausweis übertragen – Grundlage für die Vorsorgelücken-Analyse.",
      },
      {
        href: "/rechner/freizuegigkeit",
        icon: Wallet,
        title: "Freizügigkeitskonto",
        desc: "Auftrag für Konto oder Depot strukturiert vorbereiten und mit der Analyse speichern.",
      },
    ],
  },
  {
    key: "vermoegen",
    label: "Vermögen & Anlegen",
    desc: "Sparen, Anlegen und der Zinseszins über die Zeit.",
    items: [
      {
        href: "/rechner/vermoegen",
        icon: LineChart,
        title: "Vermögensrechner",
        desc: "Acht Werkzeuge: Sparen, Zinsvergleich, Inflation, Anlagekosten, Steuern und Sparziel.",
      },
      {
        href: "/rechner/anlegerprofil",
        icon: Gauge,
        title: "Anlegerprofil",
        desc: "Risikobereitschaft, Anlagehorizont und Erfahrung ergeben eine passende Aktienquote.",
      },
    ],
  },
  {
    key: "haushalt",
    label: "Haushalt",
    desc: "Die finanzielle Ausgangslage im Beratungsgespräch.",
    items: [
      {
        href: "/rechner/budget",
        icon: Coins,
        title: "Budgetrechner",
        desc: "Einnahmen und Ausgaben erfassen – Geldfluss, Sparquote und Überschuss in Echtzeit.",
      },
    ],
  },
  {
    key: "versicherung",
    label: "Gesundheit & Versicherung",
    desc: "Kranken-, Zusatz- und Sachversicherungen im Überblick.",
    items: [
      {
        href: "/rechner/franchise",
        icon: HeartPulse,
        title: "Franchise-Vergleich",
        desc: "Alle Franchisen mit den offiziellen BAG-Prämien 2026 für Wohnort, Versicherer und Modell.",
      },
      {
        href: "/versicherung/uebersicht",
        icon: ShieldCheck,
        title: "Versicherungsübersicht",
        desc: "Grund-, Zusatzversicherung und Sachdeckungen gemeinsam überblicken.",
      },
      {
        href: "/versicherung/zusatz",
        icon: ShieldPlus,
        title: "Zusatzversicherungs-Check",
        desc: "Spital- und ambulante Ergänzungen wählen und jede Deckung verständlich erklären.",
      },
      {
        href: "/versicherung/sach-motor",
        icon: Car,
        title: "Hausrat, Haftpflicht & Auto",
        desc: "Bestehende Sach- und Motorfahrzeugdeckungen erfassen und Lücken erkennen.",
      },
    ],
  },
  {
    key: "wohnen",
    label: "Wohneigentum",
    desc: "Finanzierung und Tragbarkeit von Wohneigentum.",
    items: [
      {
        href: "/rechner/tragbarkeit",
        icon: Home,
        title: "Tragbarkeitsrechner",
        desc: "Prüfen, ob Kaufpreis, Eigenkapital und Einkommen nach Schweizer Standard zusammenpassen.",
      },
    ],
  },
]

function CalcCard({ calc }: { calc: Calc }) {
  const Icon = calc.icon
  return (
    <Link
      href={calc.href}
      className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
    >
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="mt-4 flex items-start gap-1.5 text-base font-extrabold text-foreground">
        {calc.title}
        <ArrowUpRight
          className="mt-0.5 h-4 w-4 flex-none text-muted-foreground transition-colors group-hover:text-primary"
          aria-hidden="true"
        />
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{calc.desc}</p>
    </Link>
  )
}

export default function RechnerIndexPage() {
  const total = CATEGORIES.reduce((n, c) => n + c.items.length, 0)

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <header className="mb-8">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">Werkzeuge</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">Rechner</h1>
        <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
          {total} deterministische Schweizer Finanzrechner für das Beratungsgespräch – nach Themen geordnet und
          jederzeit auch direkt aus der Analyse heraus aufrufbar.
        </p>
      </header>

      <div className="space-y-10">
        {CATEGORIES.map((cat) => (
          <section key={cat.key} aria-labelledby={`cat-${cat.key}`}>
            <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-border pb-2">
              <div>
                <h2 id={`cat-${cat.key}`} className="text-lg font-extrabold text-foreground">
                  {cat.label}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{cat.desc}</p>
              </div>
              <span className="flex-none text-xs font-semibold text-muted-foreground">
                {cat.items.length} {cat.items.length === 1 ? "Rechner" : "Rechner"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cat.items.map((calc) => (
                <CalcCard key={calc.href} calc={calc} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

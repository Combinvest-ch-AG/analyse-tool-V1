import Link from "next/link"
import { PiggyBank, Home, HeartPulse, ArrowRight } from "lucide-react"

const calculators = [
  {
    icon: PiggyBank,
    title: "Vorsorgelückenanalyse",
    body: "Zwei-Phasen-Modell (Sparphase → Entnahmephase). Ermittelt die nötige Sparrate für die Altersrente und deckt Vorsorgelücken auf.",
  },
  {
    icon: Home,
    title: "Immobilien-Tragbarkeit",
    body: "Prüft die Tragbarkeit nach Schweizer Bankenstandard: 5 % Kalkulationszins und 33.3 % Einkommenslimit.",
  },
  {
    icon: HeartPulse,
    title: "Franchise-Rechner",
    body: "Vergleicht Franchise-Varianten (CHF 300–2500) mit realen Krankenkassen-Prämien für die ganze Familie.",
  },
]

export function CalculatorsSection() {
  return (
    <section id="rechner" className="scroll-mt-20 border-b border-border bg-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">
            Integrierte Rechner
          </p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Schweizer Standards, deterministische Engines
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">
            Jeder Rechner bildet offizielles Schweizer Regelwerk ab und ist vollständig
            nachvollziehbar – gleiche Eingaben ergeben stets das gleiche Resultat.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {calculators.map((calc) => (
            <Link
              key={calc.title}
              href="/login"
              className="group flex flex-col rounded-2xl border border-border bg-card p-7 text-center transition-all hover:-translate-y-1 hover:border-primary hover:shadow-[0_18px_44px_rgba(19,42,82,0.095)]"
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-primary">
                <calc.icon className="h-7 w-7" />
              </span>
              <h3 className="mt-5 text-xl font-semibold text-foreground">{calc.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{calc.body}</p>
              <span className="mt-5 inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide text-primary">
                Im Portal öffnen
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

import Link from "next/link"
import { ArrowRight, ShieldCheck } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-card to-accent">
      <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-20 md:pb-24 md:pt-28">
        <div className="flex items-center justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <span>Combinvest Advisory Engine</span>
          <span className="hidden sm:inline">Schweizer Standard · revDSG</span>
        </div>

        <div className="mt-10 grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="max-w-2xl">
            <h1 className="text-balance text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Die ganze Finanzwelt Ihrer Kunden.{" "}
              <span className="text-primary">In einer Analyse.</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Combinvest führt Berater und Kunden strukturiert durch Vorsorge, Vermögen und
              Versicherung – mit deterministischen Schweizer Rechnern und priorisierten
              Empfehlungen für acht Lebensbereiche.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-[15px] font-semibold uppercase tracking-wide text-primary-foreground shadow-[0_10px_24px_rgba(57,120,246,0.22)] transition-transform hover:-translate-y-0.5"
              >
                Berater-Portal öffnen
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#prozess"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-primary bg-transparent px-7 text-[15px] font-semibold uppercase tracking-wide text-primary transition-colors hover:bg-accent"
              >
                So funktioniert es
              </a>
            </div>

            <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-success" />
              Daten verschlüsselt in der Schweizer Cloud · DSG-konform
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_20px_50px_-24px_rgba(17,29,54,0.35)] sm:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Analyse im Überblick
            </p>
            <dl className="mt-5 divide-y divide-border">
              <div className="flex items-baseline justify-between gap-4 pb-4">
                <dd className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">8</dd>
                <dt className="text-right text-sm font-medium leading-tight text-muted-foreground">
                  Lebensbereiche
                  <span className="block text-xs text-muted-foreground/70">
                    Vorsorge bis Vermögen
                  </span>
                </dt>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-4">
                <dd className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">20</dd>
                <dt className="text-right text-sm font-medium leading-tight text-muted-foreground">
                  Fragen
                  <span className="block text-xs text-muted-foreground/70">
                    strukturierter Dialog
                  </span>
                </dt>
              </div>
              <div className="flex items-baseline justify-between gap-4 pt-4">
                <dd className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">3+</dd>
                <dt className="text-right text-sm font-medium leading-tight text-muted-foreground">
                  Schweizer Rechner
                  <span className="block text-xs text-muted-foreground/70">
                    deterministisch geprüft
                  </span>
                </dt>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}

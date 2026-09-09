import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function CtaSection() {
  return (
    <section className="bg-gradient-to-br from-primary to-primary-deep">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 md:py-24">
        <div className="max-w-2xl">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-primary-foreground md:text-4xl">
            Bereit für die nächste Beratung?
          </h2>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-primary-foreground/90">
            Öffnen Sie das Berater-Portal und führen Sie Ihre Kunden in wenigen Minuten durch eine
            vollständige Analyse mit priorisierten Handlungsempfehlungen.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-card px-7 text-[15px] font-semibold uppercase tracking-wide text-primary transition-transform hover:-translate-y-0.5"
          >
            Zum Berater-Portal
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

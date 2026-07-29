import { ClipboardCheck, FileSearch, ListChecks } from "lucide-react"

const steps = [
  {
    icon: ClipboardCheck,
    title: "Finanzstatus-Check",
    body: "20 gezielte Fragen zur persönlichen und finanziellen Situation. Das System berechnet sofort die Relevanz für alle acht Lebensbereiche.",
  },
  {
    icon: FileSearch,
    title: "Vertragscheck",
    body: "Bestehende Versicherungen und Vorsorgeprodukte erfassen. Combinvest erkennt automatisch Lücken und Redundanzen.",
  },
  {
    icon: ListChecks,
    title: "Risikoanalyse",
    body: "Priorisierte Empfehlungen für Vorsorge, Vermögen, Immobilie, Gesundheit, Kinder, Steuern, Versicherung und Schutz.",
  },
]

export function ProcessSection() {
  return (
    <section id="prozess" className="scroll-mt-20 border-b border-border bg-card">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">Funktionsweise</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Ihre Analyse in drei klaren Schritten
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">
            Ein strukturierter Prozess, der die Finanzwelt Ihrer Kunden vollständig erfasst – ohne
            Bauchgefühl, mit nachvollziehbarer Logik.
          </p>
        </div>

        <ol className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="group rounded-2xl border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-[0_18px_44px_rgba(19,42,82,0.095)]"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary">
                  <step.icon className="h-6 w-6" />
                </span>
                <span className="text-4xl font-bold tracking-tight text-muted/70">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-semibold text-foreground">{step.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

import { ShieldCheck, Lock, UserCheck, ScrollText } from "lucide-react"

const pillars = [
  {
    icon: Lock,
    title: "Verschlüsselte Schweizer Cloud",
    body: "Kundendaten werden verschlüsselt gespeichert und übertragen. Kein Verkauf, keine Weitergabe an Dritte.",
  },
  {
    icon: ShieldCheck,
    title: "DSG-konform",
    body: "Aufgebaut nach dem revidierten Schweizer Datenschutzgesetz – Transparenz und Datenminimierung als Grundprinzip.",
  },
  {
    icon: UserCheck,
    title: "Zugriff nur auf Einladung",
    body: "Ausschliesslich eingeladene Berater erhalten Zugang. Jeder sieht nur die Daten, für die er berechtigt ist.",
  },
  {
    icon: ScrollText,
    title: "Nachvollziehbar & auditierbar",
    body: "Deterministische Engines und protokollierte Änderungen machen jede Empfehlung überprüfbar.",
  },
]

export function TrustSection() {
  return (
    <section id="sicherheit" className="scroll-mt-20 border-b border-border bg-card">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-primary">
              Sicherheit & Vertrauen
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Vertrauen, das Schweizer Beratung verdient
            </h2>
            <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">
              Finanzberatung lebt von Diskretion. Combinvest behandelt jede Kundeninformation mit
              den Sicherheitsstandards, die sensible Finanzdaten in der Schweiz erfordern.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="rounded-2xl border border-border bg-background p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
                  <pillar.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

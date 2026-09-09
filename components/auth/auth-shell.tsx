import type { ReactNode } from "react"
import { ShieldCheck, TrendingUp, Lock } from "lucide-react"
import { Wordmark } from "./wordmark"

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: "FINMA-konforme Beratung",
    body: "Kunden, Termine und Analysen sicher an einem Ort.",
  },
  {
    icon: TrendingUp,
    title: "Vom Termin zum Abschluss",
    body: "Der geführte Finanzstatus-Check begleitet jedes Gespräch.",
  },
  {
    icon: Lock,
    title: "Passwortloser Zugang",
    body: "Anmeldung per Magic Link oder Sicherheitscode.",
  },
]

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel */}
      <aside className="relative flex flex-col justify-between bg-primary px-8 py-10 text-primary-foreground lg:w-[46%] lg:px-14 lg:py-14">
        <div className="flex items-center">
          <Wordmark variant="light" />
        </div>

        <div className="hidden max-w-md lg:block">
          <h2 className="text-pretty text-3xl font-extrabold leading-tight">
            Das Beratungs-Cockpit für Combinvest.
          </h2>
          <p className="mt-4 text-balance text-base leading-relaxed text-white/80">
            Melden Sie sich an, um Kunden zu betreuen, Analysen durchzuführen und
            Abschlüsse zu begleiten – schnell, sicher und ohne Passwort.
          </p>

          <ul className="mt-10 flex flex-col gap-6">
            {TRUST_POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-bold">{title}</p>
                  <p className="text-sm leading-relaxed text-white/75">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="hidden text-xs text-white/60 lg:block">
          &copy; {new Date().getFullYear()} Combinvest &middot; Egerkingen
        </p>
      </aside>

      {/* Form area */}
      <section className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  )
}

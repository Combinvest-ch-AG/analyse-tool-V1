import Link from "next/link"

const columns = [
  {
    heading: "Plattform",
    links: [
      { href: "#prozess", label: "Prozess" },
      { href: "#rechner", label: "Rechner" },
      { href: "#sicherheit", label: "Sicherheit" },
    ],
  },
  {
    heading: "Portal",
    links: [
      { href: "/login", label: "Berater-Login" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    heading: "Rechtliches",
    links: [
      { href: "/impressum", label: "Impressum" },
      { href: "/datenschutz", label: "Datenschutz" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <span className="text-xl font-extrabold tracking-tight text-background">
              combinvest
            </span>
            <p className="mt-4 text-sm leading-relaxed text-background/70">
              Die Advisory Engine für Schweizer Finanzberatung – strukturiert, transparent und auf
              den Abschluss ausgerichtet.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.heading}>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-background">
                {col.heading}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-background/70 transition-colors hover:text-background"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-background/10 pt-6 text-sm text-background/60 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Combinvest</span>
          <span>Schweizer Finanzberatung &amp; Vermögensplanung</span>
        </div>
      </div>
    </footer>
  )
}

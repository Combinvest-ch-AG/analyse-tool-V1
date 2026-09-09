import Link from "next/link"
import Image from "next/image"
import { ArrowUpRight } from "lucide-react"

const navItems = [
  { href: "#prozess", label: "Prozess" },
  { href: "#rechner", label: "Rechner" },
  { href: "#sicherheit", label: "Sicherheit" },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/85 backdrop-blur-md">
      <div className="mx-auto flex h-[76px] w-full max-w-6xl items-center justify-between gap-6 px-6">
        <Link href="/" className="flex items-center" aria-label="Combinvest Startseite">
          <Image
            src="/combinvest-logo.png"
            alt="Combinvest"
            width={117}
            height={53}
            priority
            className="h-8 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Hauptnavigation">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-[13px] font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:bg-accent hover:text-primary-deep"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wide text-primary-foreground shadow-[0_10px_24px_rgba(57,120,246,0.22)] transition-transform hover:-translate-y-0.5"
        >
          Berater-Login
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </header>
  )
}

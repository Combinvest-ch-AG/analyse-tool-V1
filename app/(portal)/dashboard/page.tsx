import Link from "next/link"
import { FolderOpen, CheckCircle2, Users, ArrowRight } from "lucide-react"
import { getCurrentAdvisor } from "@/lib/auth/advisor"
import { getDashboardData } from "@/lib/data/portal"
import { NewCustomerDialog } from "@/components/portal/new-customer-dialog"
import { initials, fullName, formatDate } from "@/lib/format"

export default async function DashboardPage() {
  const advisor = await getCurrentAdvisor()
  // Layout already guards, but keep types happy.
  if (!advisor) return null

  const { customers, analyses } = await getDashboardData(advisor.id)
  const customerById = new Map(customers.map((c) => [c.id, c]))

  const openCount = analyses.filter((a) => a.status === "draft" || a.status === "in_progress").length
  const doneCount = analyses.filter((a) => a.status === "completed").length

  const stats = [
    { label: "Offene Analysen", value: openCount, icon: FolderOpen },
    { label: "Abgeschlossen", value: doneCount, icon: CheckCircle2 },
    { label: "Kunden", value: customers.length, icon: Users },
  ]

  return (
    <main className="px-5 py-8 sm:px-8 lg:px-10">
      {/* Topbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Guten Tag, {advisor.first_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ihre Kunden und laufenden Analysen im Überblick.
          </p>
        </div>
        <NewCustomerDialog label="Neue Analyse" />
      </div>

      {/* Stats */}
      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <article
              key={s.label}
              className="rounded-2xl border border-border bg-card p-5 shadow-[0_4px_16px_rgba(19,42,82,0.05)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">{s.label}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <strong className="mt-3 block text-3xl font-bold tracking-tight text-foreground">
                {s.value}
              </strong>
            </article>
          )
        })}
      </section>

      {/* Recent analyses */}
      <section id="analysen" className="mt-6 scroll-mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Letzte Analysen</h2>
          <Link
            href="/analysen"
            className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-primary hover:underline"
          >
            Alle ansehen
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {analyses.length === 0 && <Empty>Noch keine Analyse vorhanden.</Empty>}
          {analyses.slice(0, 6).map((a) => {
            const c = customerById.get(a.customer_id)
            const done = a.status === "completed"
            return (
              <Link
                key={a.id}
                href={`/kunde/${a.customer_id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <Avatar>{initials(c?.first_name, c?.last_name)}</Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {fullName(c?.first_name, c?.last_name)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Schritt {a.current_step ?? 1} · {Number(a.progress_percent ?? 0).toFixed(0)} % ·{" "}
                    {formatDate(a.updated_at)}
                  </p>
                </div>
                <Badge done={done}>{done ? "Profil öffnen" : "Profil & Analyse"}</Badge>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Customers */}
      <section id="kunden" className="mt-5 scroll-mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Meine Kunden</h2>
          <NewCustomerDialog variant="secondary" label="Kunde erfassen" />
        </div>
        <div className="flex flex-col gap-2">
          {customers.length === 0 && <Empty>Noch keine Kunden vorhanden.</Empty>}
          {customers.map((c) => {
            const existing = analyses.find((a) => a.customer_id === c.id)
            const meta = [c.email, c.phone, [c.postcode, c.city].filter(Boolean).join(" ")]
              .filter(Boolean)
              .join(" · ")
            return (
              <Link
                key={c.id}
                href={`/kunde/${c.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <Avatar>{initials(c.first_name, c.last_name)}</Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {fullName(c.first_name, c.last_name)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{meta || "Keine Kontaktdaten"}</p>
                </div>
                <span className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-primary">
                  {existing ? "Profil öffnen" : "Analyse vorbereiten"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}

function Avatar({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
      {children}
    </span>
  )
}

function Badge({ children, done }: { children: React.ReactNode; done?: boolean }) {
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${
        done ? "bg-[#e7f8f0] text-[#08784a]" : "bg-[#fff5df] text-[#9c6105]"
      }`}
    >
      {children}
    </span>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 px-5 py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

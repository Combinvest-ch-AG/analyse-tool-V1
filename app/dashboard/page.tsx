import Link from "next/link"
import { redirect } from "next/navigation"
import { UserPlus, ShieldCheck, LayoutDashboard } from "lucide-react"
import { getCurrentAdvisor } from "@/lib/auth/advisor"
import { signOut } from "@/app/actions/auth"
import { Wordmark } from "@/components/auth/wordmark"

export default async function DashboardPage() {
  const advisor = await getCurrentAdvisor()
  if (!advisor) redirect("/login")

  const isManagement = advisor.role === "admin" || advisor.role === "manager"

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Wordmark />
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">{advisor.display_name}</p>
              <p className="text-xs capitalize text-muted-foreground">{advisor.role}</p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-balance text-2xl font-semibold text-foreground">
              Willkommen zurück, {advisor.first_name}
            </h1>
            <p className="text-sm text-muted-foreground">Combinvest Advisory Engine</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isManagement && (
            <Link
              href="/admin/invitations"
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UserPlus className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Berater einladen</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Neue Beraterinnen und Berater per E-Mail einladen und Zugänge verwalten.
                </p>
              </div>
            </Link>
          )}

          <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-muted/40 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Angemeldet</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Sichere Sitzung aktiv. Die Analyse- und Kundenmodule folgen in den nächsten Schritten der Migration.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

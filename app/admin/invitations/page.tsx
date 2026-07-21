import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, UserPlus } from "lucide-react"
import { getCurrentAdvisor } from "@/lib/auth/advisor"
import { createClient } from "@/lib/supabase/server"
import { Wordmark } from "@/components/auth/wordmark"
import { InviteForm } from "@/components/admin/invite-form"

export default async function InvitationsPage() {
  const advisor = await getCurrentAdvisor()
  if (!advisor) redirect("/login")
  if (advisor.role !== "admin" && advisor.role !== "manager") redirect("/dashboard")

  const supabase = await createClient()
  const { data: advisors } = await supabase
    .from("advisor_profiles")
    .select("id, display_name, email, role, active, auth_user_id")
    .order("last_name", { ascending: true })

  const pending = (advisors ?? []).filter((a) => !a.auth_user_id).length

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <Wordmark />
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserPlus className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-balance text-2xl font-semibold text-foreground">Berater einladen</h1>
            <p className="text-sm text-muted-foreground">
              Zugänge per E-Mail vergeben. Eingeladene erhalten einen direkten Anmeldelink.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <InviteForm />
        </div>

        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-foreground">Beraterverzeichnis</h2>
            <p className="text-sm text-muted-foreground">
              {advisors?.length ?? 0} Profile · {pending} ausstehend
            </p>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">E-Mail</th>
                  <th className="px-4 py-3 font-medium">Rolle</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(advisors ?? []).map((a) => (
                  <tr key={a.id} className="bg-card">
                    <td className="px-4 py-3 font-medium text-foreground">{a.display_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.email}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{a.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          a.auth_user_id
                            ? "inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                            : "inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                        }
                      >
                        {a.auth_user_id ? "Aktiv" : "Eingeladen"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

import Link from "next/link"
import { redirect } from "next/navigation"
import { MailCheck } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"

export default async function RegisterSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams
  if (!email) redirect("/register")

  return (
    <AuthShell>
      <div>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <MailCheck className="h-6 w-6 text-primary" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-foreground">Fast geschafft</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Wir haben einen Anmeldelink an <span className="font-semibold text-foreground">{email}</span> gesendet. Öffnen
          Sie die E-Mail und klicken Sie auf den Link, um sich anzumelden. Der Zugang ist bereits aktiv.
        </p>
        <div className="mt-6 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          Keine E-Mail erhalten? Prüfen Sie den Spam-Ordner oder{" "}
          <Link href="/register" className="font-bold text-primary hover:underline">
            versuchen Sie es erneut
          </Link>
          .
        </div>
        <Link
          href="/login"
          className="mt-6 inline-flex text-sm font-bold text-primary hover:underline"
        >
          Zur Anmeldung
        </Link>
      </div>
    </AuthShell>
  )
}

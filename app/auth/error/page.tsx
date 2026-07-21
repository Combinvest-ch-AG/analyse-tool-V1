import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"

const MESSAGES: Record<string, string> = {
  expired: "Dieser Anmeldelink ist abgelaufen oder wurde bereits verwendet. Bitte fordere einen neuen an.",
  invalid: "Dieser Anmeldelink ist ungültig. Bitte fordere einen neuen an.",
  forbidden: "Diese E-Mail-Adresse ist nicht für den Zugriff freigeschaltet. Bitte wende dich an deine Geschäftsleitung.",
  missing: "Es fehlten Angaben, um dich anzumelden. Bitte starte den Login erneut.",
  unknown: "Bei der Anmeldung ist etwas schiefgelaufen. Bitte versuche es erneut.",
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const { reason } = await searchParams
  const message = MESSAGES[reason ?? "unknown"] ?? MESSAGES.unknown

  return (
    <AuthShell>
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Anmeldung</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Anmeldung nicht möglich</h1>
        </div>
        <p className="text-pretty leading-relaxed text-muted-foreground">{message}</p>
        <Link
          href="/login"
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Zurück zur Anmeldung
        </Link>
      </div>
    </AuthShell>
  )
}

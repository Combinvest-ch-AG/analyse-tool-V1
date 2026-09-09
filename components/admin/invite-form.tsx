"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { CheckCircle2, XCircle, Send, Info } from "lucide-react"
import { inviteAdvisors, type InviteState } from "@/app/actions/invitations"

const INITIAL: InviteState = { status: "idle", message: "", results: [] }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
    >
      <Send className="h-4 w-4" aria-hidden="true" />
      {pending ? "Wird gesendet…" : "Einladungen senden"}
    </button>
  )
}

export function InviteForm() {
  const [state, formAction] = useActionState(inviteAdvisors, INITIAL)

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="emails" className="text-sm font-medium text-foreground">
            E-Mail-Adressen
          </label>
          <textarea
            id="emails"
            name="emails"
            rows={6}
            required
            placeholder={"anna.muster@combinvest.swiss\nMax Beispiel <max.beispiel@combinvest.swiss>"}
            className="w-full resize-y rounded-lg border border-input bg-background px-3.5 py-3 font-mono text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/40"
          />
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {
                'Eine Adresse pro Zeile. Optional mit Namen: "Vorname Nachname <email@combinvest.swiss>". Die erste E-Mail meldet die Person direkt an.'
              }
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="role" className="text-sm font-medium text-foreground">
            Rolle
          </label>
          <select
            id="role"
            name="role"
            defaultValue="advisor"
            className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/40 sm:max-w-xs"
          >
            <option value="advisor">Berater/in (Aussendienst)</option>
            <option value="backoffice">Innendienst / Backoffice</option>
            <option value="manager">Geschäftsleitung</option>
            <option value="trainee">Trainee</option>
          </select>
        </div>

        <div>
          <SubmitButton />
        </div>

        {state.status === "error" && (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {state.message}
          </p>
        )}
      </form>

      {state.results.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground">{state.message}</h3>
          <ul className="mt-4 flex flex-col gap-2">
            {state.results.map((r) => {
              const ok = r.status === "invited" || r.status === "reinvited"
              return (
                <li key={r.email} className="flex items-start gap-2.5 text-sm">
                  {ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                  )}
                  <span className="text-foreground">
                    <span className="font-medium">{r.email}</span>
                    <span className="text-muted-foreground"> — {r.message}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

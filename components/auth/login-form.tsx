"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Mail, ArrowRight, Loader2, AlertCircle } from "lucide-react"
import { requestLogin, type LoginState } from "@/app/actions/auth"

const initialState: LoginState = { status: "idle", message: "" }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      aria-disabled={pending}
      className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-[var(--color-primary-deep)] aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Code wird gesendet…</span>
        </>
      ) : (
        <>
          <span>Login-Link anfordern</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </>
      )}
    </button>
  )
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(requestLogin, initialState)

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Berater-Portal</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Geben Sie Ihre Combinvest-E-Mail ein. Sie erhalten einen Magic Link und
        einen Sicherheitscode zur Anmeldung.
      </p>

      <form action={formAction} className="mt-8">
        <input type="hidden" name="next" value={next} />

        <label htmlFor="email" className="mb-2 block text-xs font-bold text-foreground">
          E-Mail-Adresse
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            defaultValue={state.email ?? ""}
            placeholder="vorname.nachname@combinvest.swiss"
            className="w-full rounded-xl border border-input bg-card py-3.5 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/40"
          />
        </div>

        {state.status === "error" && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-destructive">{state.message}</p>
          </div>
        )}

        <SubmitButton />
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Kein Zugang? Bitte wenden Sie sich an Ihre Administration.
      </p>
    </div>
  )
}

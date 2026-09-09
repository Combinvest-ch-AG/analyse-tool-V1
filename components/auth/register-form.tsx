"use client"

import Link from "next/link"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Mail, User, ArrowRight, Loader2, AlertCircle } from "lucide-react"
import { registerAdvisor, type RegisterState } from "@/app/actions/register"

const initialState: RegisterState = { status: "idle", message: "" }

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
          <span>Zugang wird erstellt…</span>
        </>
      ) : (
        <>
          <span>Zugang erstellen</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </>
      )}
    </button>
  )
}

const FIELD =
  "w-full rounded-xl border border-input bg-card py-3.5 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/40"

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAdvisor, initialState)
  const v = state.values

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Berater-Zugang erstellen</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Für Combinvest-Berater. Registrieren Sie sich mit Ihrer{" "}
        <span className="font-semibold text-foreground">@combinvest.swiss</span>-Adresse – Sie erhalten sofort einen
        Anmeldelink per E-Mail.
      </p>

      <form action={formAction} className="mt-8 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="mb-2 block text-xs font-bold text-foreground">
              Vorname
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input id="firstName" name="firstName" type="text" required defaultValue={v?.firstName ?? ""} placeholder="Vorname" className={FIELD} />
            </div>
          </div>
          <div>
            <label htmlFor="lastName" className="mb-2 block text-xs font-bold text-foreground">
              Nachname
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input id="lastName" name="lastName" type="text" required defaultValue={v?.lastName ?? ""} placeholder="Nachname" className={FIELD} />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block text-xs font-bold text-foreground">
            Combinvest-E-Mail
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              defaultValue={v?.email ?? ""}
              placeholder="vorname.nachname@combinvest.swiss"
              className={FIELD}
            />
          </div>
        </div>

        {state.status === "error" && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-destructive">{state.message}</p>
          </div>
        )}

        <SubmitButton />
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Bereits registriert?{" "}
        <Link href="/login" className="font-bold text-primary hover:underline">
          Zur Anmeldung
        </Link>
      </p>
    </div>
  )
}

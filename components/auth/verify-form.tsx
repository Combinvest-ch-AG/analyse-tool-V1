"use client"

import { useActionState, useState, useTransition } from "react"
import { useFormStatus } from "react-dom"
import Link from "next/link"
import { ShieldCheck, Loader2, AlertCircle, MailCheck, RefreshCw } from "lucide-react"
import { verifyCode, resendCode, type VerifyState } from "@/app/actions/auth"
import { OtpInput } from "./otp-input"

const initialState: VerifyState = { status: "idle", message: "" }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      aria-disabled={pending}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-[var(--color-primary-deep)] aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Wird verifiziert…</span>
        </>
      ) : (
        <>
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span>Anmelden</span>
        </>
      )}
    </button>
  )
}

export function VerifyForm({ email, next }: { email: string; next: string }) {
  const [state, formAction] = useActionState(verifyCode, initialState)
  const [resent, setResent] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleResend() {
    setResent(false)
    startTransition(async () => {
      const { ok } = await resendCode(email)
      if (ok) setResent(true)
    })
  }

  return (
    <div>
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
        <MailCheck className="h-6 w-6 text-[var(--color-accent-foreground)]" aria-hidden="true" />
      </div>

      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">E-Mail bestätigen</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Wir haben einen Login-Link und einen 6-stelligen Code an{" "}
        <span className="font-semibold text-foreground">{email}</span> gesendet.
        Klicken Sie auf den Link – oder geben Sie den Code hier ein.
      </p>

      <form action={formAction} className="mt-8">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />

        <OtpInput />

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

      <div className="mt-6 flex items-center justify-between text-xs">
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Andere E-Mail verwenden
        </Link>
        <button
          type="button"
          onClick={handleResend}
          disabled={isPending}
          className="flex items-center gap-1.5 font-semibold text-muted-foreground transition hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} aria-hidden="true" />
          {resent ? "Erneut gesendet" : "Code erneut senden"}
        </button>
      </div>
    </div>
  )
}

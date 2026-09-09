"use client"

import { useRef, useState } from "react"
import { FileText, Eraser, CheckCircle2, Loader2 } from "lucide-react"
import { SignaturePad, type SignaturePadHandle } from "@/components/portal/documents/signature-pad"
import { submitCustomerSignature } from "@/app/actions/signatures"

type Doc = { id: string; name: string; previewUrl: string | null }

export function RemoteSign({
  token,
  customerName,
  docs,
  advisorEmail,
}: {
  token: string
  customerName: string | null
  docs: Doc[]
  advisorEmail: string | null
}) {
  const padRef = useRef<SignaturePadHandle>(null)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit() {
    setError(null)
    if (padRef.current?.isEmpty()) {
      setError("Bitte unterschreiben Sie im Feld.")
      return
    }
    if (!consent) {
      setError("Bitte bestätigen Sie die Einwilligung zur elektronischen Unterschrift.")
      return
    }
    setBusy(true)
    const res = await submitCustomerSignature({
      token,
      signaturePng: padRef.current?.toDataURL() ?? "",
      consent,
    })
    setBusy(false)
    if (res.ok) setDone(true)
    else setError(res.error ?? "Die Unterschrift konnte nicht gespeichert werden.")
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Vielen Dank!</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Ihre Unterschrift wurde erfasst und an Ihren Berater übermittelt. Sie können dieses Fenster nun schliessen.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <h1 className="text-xl font-bold text-balance text-foreground">
        {customerName ? `Guten Tag ${customerName},` : "Guten Tag,"}
      </h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        Bitte prüfen Sie Ihre Unterlagen und unterschreiben Sie anschliessend digital.
      </p>

      <ul className="mt-5 space-y-2">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate text-sm font-medium text-foreground">{d.name}</span>
            </span>
            {d.previewUrl ? (
              <a
                href={d.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-xs font-semibold text-primary underline-offset-2 hover:underline"
              >
                Ansehen
              </a>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground">Ihre Unterschrift</label>
          <button
            type="button"
            onClick={() => padRef.current?.clear()}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Eraser className="h-3.5 w-3.5" /> Löschen
          </button>
        </div>
        <SignaturePad ref={padRef} ariaLabel="Unterschriftfeld" />
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        />
        <span className="text-[13px] leading-relaxed text-muted-foreground">
          Ich bestätige, dass ich die oben aufgeführten Dokumente gelesen habe und sie mit meiner
          elektronischen Unterschrift rechtsverbindlich unterzeichne. Zeitpunkt und technische Daten
          werden zu Nachweiszwecken protokolliert.
        </span>
      </label>

      {error ? <p className="mt-4 text-sm font-medium text-destructive">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {busy ? "Wird übermittelt …" : "Rechtsverbindlich unterschreiben"}
      </button>

      {advisorEmail ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Fragen? Wenden Sie sich an {advisorEmail}
        </p>
      ) : null}
    </div>
  )
}

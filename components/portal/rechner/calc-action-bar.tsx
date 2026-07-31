"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Check, Cloud, CloudOff, Download, LoaderCircle, RotateCcw } from "lucide-react"
import { saveCalculatorResult } from "@/app/actions/portal"

export type CalcContext = {
  analysisId?: string
  customerId?: string
}

export type SavedCalculatorPayload = Record<string, unknown> | undefined

type SaveState = "standalone" | "idle" | "dirty" | "saving" | "saved" | "error"

function saveLabel(state: SaveState, savedAt: Date | null) {
  if (state === "standalone") return "Nur in einer Kundenanalyse speicherbar"
  if (state === "dirty") return "Ungespeicherte Änderungen"
  if (state === "saving") return "Wird gespeichert …"
  if (state === "error") return "Speichern fehlgeschlagen – erneut versuchen"
  if (state === "saved" && savedAt) {
    return `Gespeichert um ${savedAt.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })}`
  }
  return "Automatisches Speichern aktiv"
}

/**
 * Gemeinsame Speicherleiste aller Rechner. Änderungen werden verzögert und
 * konfliktfest in der geöffneten Analyse gespeichert. Der manuelle Button
 * erzeugt zusätzlich einen nachvollziehbaren Revisionspunkt.
 */
export function CalcActionBar({
  ctx,
  calcKey,
  buildPayload,
  onReset,
}: {
  ctx: CalcContext
  calcKey: string
  buildPayload: () => Record<string, unknown>
  onReset: () => void
}) {
  const canSave = Boolean(ctx.analysisId)
  const payload = buildPayload()
  const fingerprint = useMemo(() => JSON.stringify(payload), [payload])
  const payloadRef = useRef(payload)
  const initialFingerprint = useRef<string | null>(null)
  const lastSavedFingerprint = useRef<string | null>(null)
  const sequence = useRef(Promise.resolve())
  const mounted = useRef(true)
  const [state, setState] = useState<SaveState>(canSave ? "idle" : "standalone")
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  payloadRef.current = payload

  const persist = useCallback((writeRevision: boolean) => {
    if (!ctx.analysisId) return Promise.resolve(false)
    const currentPayload = payloadRef.current
    const currentFingerprint = JSON.stringify(currentPayload)
    setState("saving")
    setErrorMessage(null)

    const operation = sequence.current
      .catch(() => undefined)
      .then(async () => {
        const result = await saveCalculatorResult({
          analysisId: ctx.analysisId!,
          key: calcKey,
          payload: currentPayload,
          writeRevision,
        })
        if (!mounted.current) return result.ok
        if (result.ok) {
          lastSavedFingerprint.current = currentFingerprint
          setSavedAt(new Date(result.savedAt))
          setState("saved")
          return true
        }
        setErrorMessage(result.error)
        setState("error")
        return false
      })

    sequence.current = operation.then(() => undefined)
    return operation
  }, [calcKey, ctx.analysisId])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!canSave) return
    if (initialFingerprint.current === null) {
      initialFingerprint.current = fingerprint
    }
    if (fingerprint === lastSavedFingerprint.current) return

    // Opening a calculator inside an analysis counts as using it. Persist the
    // initial, already calculated state as well, so the customer report can
    // include every calculator that was actually consulted during the meeting.
    setState("dirty")
    const timer = window.setTimeout(() => void persist(false), 900)
    return () => window.clearTimeout(timer)
  }, [canSave, fingerprint, persist])

  useEffect(() => {
    if (state !== "dirty" && state !== "saving") return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [state])

  const backHref = ctx.analysisId ? `/analyse/${ctx.analysisId}` : "/rechner"
  const backLabel = ctx.analysisId ? "Zur Risikoanalyse" : "Zu den Rechnern"
  const StatusIcon = state === "saving" ? LoaderCircle : state === "error" ? CloudOff : state === "saved" ? Check : Cloud

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3">
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-[13px] font-bold text-foreground transition-colors hover:bg-muted"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        Zurücksetzen
      </button>

      <button
        type="button"
        onClick={() => void persist(true)}
        disabled={!canSave || state === "saving"}
        title={canSave ? "Aktuellen Stand jetzt sichern" : "Rechner aus einer Kundenanalyse öffnen"}
        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-45"
      >
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        {state === "saving" ? "Speichert …" : "Stand sichern"}
      </button>

      {ctx.analysisId ? (
        <a
          href={`/analyse/${ctx.analysisId}/report.pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-[13px] font-bold text-foreground transition-colors hover:bg-muted"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          PDF-Bericht
        </a>
      ) : null}

      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-[13px] font-bold text-foreground transition-colors hover:bg-muted"
      >
        {backLabel}
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>

      <span
        aria-live="polite"
        title={errorMessage ?? undefined}
        data-save-error={errorMessage ?? undefined}
        className={`ml-auto inline-flex items-center gap-1.5 text-[12px] font-semibold ${
          state === "error" ? "text-destructive" : state === "saved" ? "text-success" : "text-muted-foreground"
        }`}
      >
        <StatusIcon className={`h-3.5 w-3.5 ${state === "saving" ? "animate-spin" : ""}`} aria-hidden="true" />
        {saveLabel(state, savedAt)}
      </span>
    </div>
  )
}

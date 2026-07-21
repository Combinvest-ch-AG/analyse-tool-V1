"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { RotateCcw, Download, ArrowUpRight, ClipboardCheck } from "lucide-react"
import { saveCalculatorResult } from "@/app/actions/portal"

export type CalcContext = {
  analysisId?: string
  customerId?: string
}

/**
 * Shared action bar for all calculators — mirrors the original
 * "Zurücksetzen · In Analyse übernehmen · PDF-Bericht · Zur Risikoanalyse".
 * "In Analyse übernehmen" is only enabled when the calculator was opened from
 * a customer analysis (analysisId present).
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
  const [pending, startTransition] = useTransition()
  const [state, setState] = useState<{ kind: "idle" | "ok" | "warn"; msg: string }>({
    kind: "idle",
    msg: ctx.analysisId ? "Übernahme optional" : "Rechner aus einer Kundenanalyse öffnen",
  })

  const canTransfer = !!ctx.analysisId
  const backHref = ctx.analysisId ? `/analyse/${ctx.analysisId}?step=3` : "/dashboard"

  function transfer() {
    if (!ctx.analysisId) return
    startTransition(async () => {
      const res = await saveCalculatorResult({
        analysisId: ctx.analysisId!,
        key: calcKey,
        payload: buildPayload(),
      })
      setState(
        res.ok
          ? { kind: "ok", msg: "Ergebnis übernommen" }
          : { kind: "warn", msg: "Übernahme nicht möglich" },
      )
    })
  }

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
        onClick={transfer}
        disabled={!canTransfer || pending}
        title={canTransfer ? undefined : "Rechner aus einer Kundenanalyse öffnen"}
        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-45"
      >
        <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {pending ? "Wird übernommen …" : "In Analyse übernehmen"}
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
      ) : (
        <button
          type="button"
          disabled
          title="Rechner aus einer Kundenanalyse öffnen"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-[13px] font-bold text-foreground opacity-45"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          PDF-Bericht
        </button>
      )}

      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-[13px] font-bold text-foreground transition-colors hover:bg-muted"
      >
        Zur Risikoanalyse
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>

      <span
        aria-live="polite"
        className={`ml-auto text-[12px] font-semibold ${
          state.kind === "ok"
            ? "text-success"
            : state.kind === "warn"
              ? "text-destructive"
              : "text-muted-foreground"
        }`}
      >
        {state.msg}
      </span>
    </div>
  )
}

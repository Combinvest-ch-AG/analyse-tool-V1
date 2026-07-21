"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Play, Plus } from "lucide-react"
import { startCustomerAnalysis } from "@/app/actions/portal"

export function StartAnalysisButton({
  customerId,
  label = "Neue Analyse starten",
  variant = "primary",
}: {
  customerId: string
  label?: string
  variant?: "primary" | "secondary"
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function onClick() {
    setError(null)
    startTransition(async () => {
      const result = await startCustomerAnalysis(customerId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push(`/analyse/${result.analysisId}`)
    })
  }

  const btnClass =
    variant === "primary"
      ? "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[#245bd2] disabled:opacity-60"
      : "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={onClick} disabled={pending} className={btnClass}>
        {variant === "primary" ? <Plus className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {pending ? "Wird gestartet …" : label}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}

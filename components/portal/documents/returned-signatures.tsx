"use client"

import { useRef, useState } from "react"
import useSWR from "swr"
import { Download, Loader2, PenLine, CheckCircle2, Clock, Mail } from "lucide-react"
import { SignaturePad, type SignaturePadHandle } from "./signature-pad"
import { listSignatureRequests, advisorCompleteSignature } from "@/app/actions/signatures"

type Req = Awaited<ReturnType<typeof listSignatureRequests>>[number]

const STATUS_META: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  sent: { label: "Gesendet", className: "bg-muted text-muted-foreground", icon: Mail },
  viewed: { label: "Geöffnet", className: "bg-primary/10 text-primary", icon: Clock },
  signed_by_customer: { label: "Kunde hat unterschrieben", className: "bg-warning/15 text-warning-deep", icon: PenLine },
  completed: { label: "Abgeschlossen", className: "bg-success/10 text-success", icon: CheckCircle2 },
  expired: { label: "Abgelaufen", className: "bg-destructive/10 text-destructive", icon: Clock },
  cancelled: { label: "Zurückgezogen", className: "bg-muted text-muted-foreground", icon: Clock },
}

export function ReturnedSignatures({ analysisId, refreshKey }: { analysisId: string; refreshKey: number }) {
  const { data, mutate, isLoading } = useSWR(
    ["signature-requests", analysisId, refreshKey],
    () => listSignatureRequests(analysisId),
    { refreshInterval: 20000 },
  )

  if (isLoading && !data) {
    return (
      <div className="mt-6 flex items-center gap-2 border-t border-border pt-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Signatur-Anfragen werden geladen …
      </div>
    )
  }
  if (!data || data.length === 0) return null

  return (
    <div className="mt-6 border-t border-border pt-6">
      <h3 className="text-sm font-bold text-foreground">Digitale Signatur-Anfragen</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Status der per E-Mail versendeten Unterlagen und Berater-Gegenzeichnung.</p>
      <div className="mt-4 grid gap-3">
        {data.map((req) => (
          <RequestCard key={req.id} req={req} onChanged={() => mutate()} />
        ))}
      </div>
    </div>
  )
}

function RequestCard({ req, onChanged }: { req: Req; onChanged: () => void }) {
  const padRef = useRef<SignaturePadHandle>(null)
  const [signing, setSigning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const meta = STATUS_META[req.status] ?? STATUS_META.sent
  const StatusIcon = meta.icon

  async function complete() {
    setError(null)
    if (padRef.current?.isEmpty()) {
      setError("Bitte die Beraterunterschrift zeichnen.")
      return
    }
    setBusy(true)
    const res = await advisorCompleteSignature({ requestId: req.id, signaturePng: padRef.current?.toDataURL() ?? "" })
    setBusy(false)
    if (res.ok) {
      setSigning(false)
      onChanged()
    } else {
      setError(res.error ?? "Die Beraterunterschrift konnte nicht ergänzt werden.")
    }
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{req.customerName || req.customerEmail}</p>
          <p className="text-xs text-muted-foreground">{req.customerEmail}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
          <StatusIcon className="h-3.5 w-3.5" /> {meta.label}
        </span>
      </div>

      {(req.status === "signed_by_customer" || req.status === "completed") && (
        <div className="mt-3 grid gap-1.5">
          {req.docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
              <span className="truncate text-foreground">{d.name}</span>
              {d.downloadUrl ? (
                <a href={d.downloadUrl} target="_blank" rel="noreferrer" className="inline-flex flex-none items-center gap-1 text-xs font-bold text-primary">
                  <Download className="h-3.5 w-3.5" /> PDF
                </a>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {req.status === "signed_by_customer" && !signing && (
        <button
          type="button"
          onClick={() => setSigning(true)}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:opacity-90"
        >
          <PenLine className="h-4 w-4" /> Beraterunterschrift ergänzen
        </button>
      )}

      {signing && (
        <div className="mt-3 rounded-lg border border-border p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Ihre Unterschrift</span>
            <button type="button" onClick={() => padRef.current?.clear()} className="text-xs font-medium text-muted-foreground hover:text-foreground">
              Löschen
            </button>
          </div>
          <SignaturePad ref={padRef} ariaLabel="Beraterunterschrift" />
          {error && <p className="mt-2 text-sm font-semibold text-destructive">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={complete}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {busy ? "Wird abgeschlossen …" : "Abschliessen"}
            </button>
            <button type="button" onClick={() => setSigning(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

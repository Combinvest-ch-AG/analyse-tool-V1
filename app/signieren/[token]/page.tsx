import type { Metadata } from "next"
import { getSignatureRequestByToken } from "@/app/actions/signatures"
import { RemoteSign } from "@/components/signing/remote-sign"
import { ShieldCheck, Clock, CheckCircle2 } from "lucide-react"

export const metadata: Metadata = {
  title: "Dokumente unterschreiben | Combinvest",
  robots: { index: false, follow: false },
}

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const request = await getSignatureRequestByToken(token)

  if (!request) return <Shell><Notice tone="error" title="Link ungültig" text="Dieser Signatur-Link ist unbekannt oder wurde zurückgezogen." /></Shell>
  if (request.expired) return <Shell><Notice tone="error" title="Link abgelaufen" text="Dieser Link ist nicht mehr gültig. Bitte fordern Sie bei Ihrem Berater einen neuen an." /></Shell>
  if (request.status === "signed_by_customer" || request.status === "completed") {
    return (
      <Shell>
        <Notice
          tone="success"
          title="Bereits unterschrieben"
          text="Vielen Dank – Ihre Unterschrift wurde erfasst. Sie können dieses Fenster schliessen."
        />
      </Shell>
    )
  }

  return (
    <Shell>
      <RemoteSign token={token} customerName={request.customerName} docs={request.docs} advisorEmail={request.advisorEmail} />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-muted/40 px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <span className="text-lg font-black tracking-tight text-primary">Combinvest</span>
      </div>
      <div className="w-full max-w-2xl">{children}</div>
      <p className="mt-8 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> Sichere, verschlüsselte Übertragung
      </p>
    </main>
  )
}

function Notice({ tone, title, text }: { tone: "error" | "success"; title: string; text: string }) {
  const Icon = tone === "success" ? CheckCircle2 : Clock
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${tone === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
        <Icon className="h-6 w-6" />
      </div>
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  )
}

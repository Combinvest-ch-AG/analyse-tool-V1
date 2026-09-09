/**
 * Rueckkanal an Catalyst.
 *
 * Wir senden nur einen *Ping* ("etwas hat sich geaendert"), keine Fachdaten.
 * Catalyst holt den Stand danach ueber den Pull-Endpunkt. Vorteile:
 *   - kein PII in Webhook-Logs / Retry-Queues,
 *   - Catalyst bestimmt den Zeitpunkt der Verarbeitung selbst,
 *   - der Ping bleibt klein und damit zuverlaessig wiederholbar.
 *
 * Fehler werden geschluckt: ein nicht erreichbares Catalyst darf die Beratung
 * niemals blockieren. Der Versuch wird in catalyst_sessions protokolliert.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { CONTRACT_VERSION, catalystEventSchema, type CatalystEvent } from "./contract"
import { signOutboundBody } from "./auth"
import { getCatalystConfig, isCatalystReady } from "./config"

const TIMEOUT_MS = 8000

export type NotifyOutcome = { delivered: boolean; reason?: string }

/**
 * Meldet ein Ereignis fuer die Analyse an Catalyst — sofern die Analyse
 * ueberhaupt mit einer Catalyst-Sitzung verknuepft ist. Ist sie es nicht
 * (Analyse rein lokal begonnen), passiert stillschweigend nichts.
 */
export async function notifyCatalyst(
  analysisId: string,
  event: CatalystEvent["event"],
): Promise<NotifyOutcome> {
  const config = getCatalystConfig()
  if (!isCatalystReady(config)) return { delivered: false, reason: "integration inaktiv" }

  const admin = createAdminClient()

  const session = await admin
    .from("catalyst_sessions")
    .select("id, external_id, callback_url, notify_attempts")
    .eq("analysis_id", analysisId)
    .maybeSingle()
  if (session.error || !session.data?.callback_url) {
    return { delivered: false, reason: "keine verknuepfte Catalyst-Sitzung" }
  }

  const analysis = await admin
    .from("analyses")
    .select("lock_version")
    .eq("id", analysisId)
    .maybeSingle()

  const payload = catalystEventSchema.parse({
    externalId: session.data.external_id,
    event,
    analysisId,
    revision: Number(analysis.data?.lock_version ?? 0),
    occurredAt: new Date().toISOString(),
    contractVersion: CONTRACT_VERSION,
  } satisfies CatalystEvent)

  const body = JSON.stringify(payload)
  const signed = signOutboundBody(body, config.webhookSecret)

  let delivered = false
  let reason: string | undefined

  try {
    const response = await fetch(session.data.callback_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Combinvest-Signature": signed.signature,
        "X-Combinvest-Timestamp": signed.timestamp,
        "X-Combinvest-Event": event,
        "X-Combinvest-Contract": CONTRACT_VERSION,
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    delivered = response.ok
    if (!response.ok) reason = `HTTP ${response.status}`
  } catch (error) {
    reason = (error as Error).message
  }

  // Zustellprotokoll fortschreiben. Bewusst best-effort.
  await admin
    .from("catalyst_sessions")
    .update({
      status: event,
      last_notified_at: delivered ? new Date().toISOString() : undefined,
      notify_attempts: Number(session.data.notify_attempts ?? 0) + 1,
      last_error: delivered ? null : (reason ?? "unbekannter Fehler"),
    })
    .eq("id", session.data.id)

  if (!delivered) {
    console.log(`[v0] catalyst notify (${event}) fehlgeschlagen: ${reason}`)
  }

  return { delivered, reason }
}

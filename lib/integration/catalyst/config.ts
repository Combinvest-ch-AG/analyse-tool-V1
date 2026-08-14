/**
 * Konfiguration der Catalyst-Integration.
 *
 * Alles laeuft ueber einen Feature-Flag: solange CATALYST_INTEGRATION_ENABLED
 * nicht auf "true" steht, antworten die Integrations-Endpunkte mit 404. Damit
 * kann der Code gefahrlos deployed werden, bevor Catalyst bereit ist (gleiches
 * Muster wie Catalysts eigener `isDisabled`-Router-Guard).
 */

export type CatalystConfig = {
  enabled: boolean
  /** Von Catalyst gesendetes Bearer-Token fuer eingehende Aufrufe. */
  inboundToken: string
  /** Secret, mit dem wir unsere Rueckkanal-Pings HMAC-signieren. */
  webhookSecret: string
  /** Secret fuer die kurzlebigen Deep-Link-Tokens. */
  deeplinkSecret: string
  /** Oeffentliche Basis-URL dieser App (fuer den Deep-Link). */
  appUrl: string
  /** Gueltigkeit des Deep-Link-Tokens in Minuten. */
  deeplinkTtlMinutes: number
}

function firstNonEmpty(...values: (string | undefined)[]): string {
  for (const value of values) {
    if (value && value.trim().length > 0) return value.trim()
  }
  return ""
}

export function getCatalystConfig(): CatalystConfig {
  const appUrl = firstNonEmpty(
    process.env.CATALYST_APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    "http://localhost:3000",
  )

  return {
    enabled: process.env.CATALYST_INTEGRATION_ENABLED === "true",
    inboundToken: firstNonEmpty(process.env.CATALYST_INBOUND_TOKEN),
    webhookSecret: firstNonEmpty(process.env.CATALYST_WEBHOOK_SECRET),
    deeplinkSecret: firstNonEmpty(
      process.env.CATALYST_DEEPLINK_SECRET,
      process.env.CATALYST_WEBHOOK_SECRET,
    ),
    appUrl: appUrl.replace(/\/+$/, ""),
    deeplinkTtlMinutes: Number(process.env.CATALYST_DEEPLINK_TTL_MINUTES ?? 30),
  }
}

/**
 * Prueft, ob die Integration betriebsbereit ist. Fehlende Secrets werden als
 * "nicht aktiv" behandelt, damit ein halb konfiguriertes Deployment keine
 * offenen Endpunkte hinterlaesst.
 */
export function isCatalystReady(config: CatalystConfig = getCatalystConfig()): boolean {
  return (
    config.enabled &&
    config.inboundToken.length >= 20 &&
    config.webhookSecret.length >= 20 &&
    config.deeplinkSecret.length >= 20
  )
}

/**
 * Auth-Primitiven der Catalyst-Integration.
 *
 * - Eingehend: statisches Bearer-Token, zeitkonstant verglichen.
 * - Ausgehend: HMAC-SHA256 ueber den Rohbody, damit Catalyst unsere Pings
 *   verifizieren kann (Header X-Combinvest-Signature + X-Combinvest-Timestamp).
 * - Deep-Link: signiertes, kurzlebiges Einmal-Token. In der DB liegt nur der
 *   SHA-256-Hash, nie das Token selbst.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  // timingSafeEqual verlangt gleiche Laenge — Laengenunterschied vorab abfangen,
  // ohne fruehen Abbruch innerhalb des Vergleichs selbst.
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/** Prueft den Authorization-Header eingehender Catalyst-Aufrufe. */
export function verifyInboundBearer(header: string | null, expectedToken: string): boolean {
  if (!header || expectedToken.length === 0) return false
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  if (!match) return false
  return safeEqual(match[1].trim(), expectedToken)
}

export type SignedBody = {
  body: string
  signature: string
  timestamp: string
}

/** Signiert einen Rueckkanal-Body: HMAC ueber "{timestamp}.{body}". */
export function signOutboundBody(body: string, secret: string): SignedBody {
  const timestamp = Date.now().toString()
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")
  return { body, signature, timestamp }
}

const TOKEN_SEPARATOR = "."

/**
 * Erzeugt ein Deep-Link-Token `{externalId-b64url}.{nonce}.{hmac}`.
 * Zurueckgegeben wird zusaetzlich der Hash zur Ablage in der DB.
 */
export function createDeeplinkToken(
  externalId: string,
  secret: string,
): { token: string; tokenHash: string } {
  const payload = Buffer.from(externalId, "utf8").toString("base64url")
  const nonce = randomBytes(24).toString("base64url")
  const signature = createHmac("sha256", secret)
    .update(`${payload}${TOKEN_SEPARATOR}${nonce}`)
    .digest("base64url")
  const token = [payload, nonce, signature].join(TOKEN_SEPARATOR)
  return { token, tokenHash: hashDeeplinkToken(token) }
}

/** Stabiler Hash fuer die Ablage und den Abgleich. */
export function hashDeeplinkToken(token: string): string {
  return createHmac("sha256", "catalyst-deeplink").update(token).digest("hex")
}

/**
 * Verifiziert Signatur und Struktur eines Deep-Link-Tokens und liefert die
 * externalId zurueck. Gueltigkeit und Einmal-Verbrauch werden gegen die DB
 * geprueft, nicht hier.
 */
export function readDeeplinkToken(token: string, secret: string): { externalId: string } | null {
  const parts = token.split(TOKEN_SEPARATOR)
  if (parts.length !== 3) return null
  const [payload, nonce, signature] = parts
  const expected = createHmac("sha256", secret)
    .update(`${payload}${TOKEN_SEPARATOR}${nonce}`)
    .digest("base64url")
  if (!safeEqual(signature, expected)) return null
  try {
    const externalId = Buffer.from(payload, "base64url").toString("utf8")
    return externalId.length > 0 ? { externalId } : null
  } catch {
    return null
  }
}

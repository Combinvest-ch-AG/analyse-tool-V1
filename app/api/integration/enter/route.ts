/**
 * GET /api/integration/enter?token=...
 *
 * Deep-Link-Einstieg aus Catalyst. Der Berater klickt in Catalyst auf
 * "Analyse oeffnen"; Catalyst hat vorher eine Sitzung erstellt und leitet
 * hierher weiter. Wir:
 *
 *   1. verifizieren das signierte Einmal-Token,
 *   2. ordnen den Berater ueber seine E-Mail zu (in beiden Systemen gleich),
 *   3. setzen eine echte Supabase-Session (Magic-Link serverseitig eingeloest),
 *   4. entwerten das Token und leiten in die Analyse.
 *
 * Das Token ist einmalig verwendbar und kurzlebig; ein zweiter Klick auf den
 * gleichen Link fuehrt zur Login-Seite statt zu einer stillen Uebernahme.
 */

import { NextResponse, after } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getCatalystConfig, isCatalystReady } from "@/lib/integration/catalyst/config"
import { hashDeeplinkToken, readDeeplinkToken } from "@/lib/integration/catalyst/auth"
import { notifyCatalyst } from "@/lib/integration/catalyst/notify"

export const dynamic = "force-dynamic"

function fail(appUrl: string, reason: string) {
  const url = new URL("/login", appUrl)
  url.searchParams.set("integration_error", reason)
  return NextResponse.redirect(url)
}

export async function GET(request: Request) {
  const config = getCatalystConfig()

  if (!isCatalystReady(config)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const token = new URL(request.url).searchParams.get("token")
  if (!token) return fail(config.appUrl, "token_fehlt")

  const read = readDeeplinkToken(token, config.deeplinkSecret)
  if (!read) return fail(config.appUrl, "token_ungueltig")

  const admin = createAdminClient()

  const session = await admin
    .from("catalyst_sessions")
    .select("id, analysis_id, advisor_email, token_hash, token_consumed_at, expires_at")
    .eq("external_id", read.externalId)
    .maybeSingle()

  if (session.error || !session.data) return fail(config.appUrl, "sitzung_unbekannt")

  const row = session.data
  if (!row.token_hash || row.token_hash !== hashDeeplinkToken(token)) {
    return fail(config.appUrl, "token_ersetzt")
  }
  if (row.token_consumed_at) return fail(config.appUrl, "token_verbraucht")
  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    return fail(config.appUrl, "token_abgelaufen")
  }
  if (!row.analysis_id) return fail(config.appUrl, "analyse_fehlt")

  const advisorEmail = row.advisor_email as string

  // Magic-Link serverseitig erzeugen und direkt einloesen: der Berater bekommt
  // eine regulaere Supabase-Session, es entsteht kein Sonder-Auth-Pfad.
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: advisorEmail,
  })
  const hashedToken = link.data?.properties?.hashed_token
  if (link.error || !hashedToken) {
    console.log("[v0] catalyst enter: generateLink fehlgeschlagen:", link.error?.message)
    return fail(config.appUrl, "berater_unbekannt")
  }

  const supabase = await createClient()
  const verified = await supabase.auth.verifyOtp({
    token_hash: hashedToken,
    type: "magiclink",
  })
  if (verified.error) {
    console.log("[v0] catalyst enter: verifyOtp fehlgeschlagen:", verified.error.message)
    return fail(config.appUrl, "anmeldung_fehlgeschlagen")
  }

  // Token entwerten (Einmal-Verwendung) und Sitzung als geoeffnet markieren.
  await admin
    .from("catalyst_sessions")
    .update({ token_consumed_at: new Date().toISOString(), status: "opened" })
    .eq("id", row.id)

  const analysisId = row.analysis_id as string

  // Catalyst darf erfahren, dass die Analyse geoeffnet wurde — ohne den
  // Redirect des Beraters zu verzoegern.
  after(async () => {
    await notifyCatalyst(analysisId, "opened")
  })

  return NextResponse.redirect(new URL(`/analyse/${analysisId}`, config.appUrl))
}

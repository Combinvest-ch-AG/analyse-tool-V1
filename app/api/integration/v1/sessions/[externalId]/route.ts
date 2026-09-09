/**
 * GET /api/integration/v1/sessions/{externalId}
 *
 * Pull-Endpunkt: Catalyst holt hier den vollstaendigen Analysestand ab,
 * nachdem es unseren Ping erhalten hat. Der Ping selbst enthaelt bewusst keine
 * Fachdaten (kein PII in Webhook-Logs).
 */

import { NextResponse } from "next/server"
import { getCatalystConfig, isCatalystReady } from "@/lib/integration/catalyst/config"
import { verifyInboundBearer } from "@/lib/integration/catalyst/auth"
import { buildSessionResult } from "@/lib/integration/catalyst/service"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ externalId: string }> },
) {
  const config = getCatalystConfig()

  if (!isCatalystReady(config)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (!verifyInboundBearer(request.headers.get("authorization"), config.inboundToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { externalId } = await params

  try {
    const result = await buildSessionResult(externalId)
    if (!result) {
      return NextResponse.json({ error: "Sitzung nicht gefunden." }, { status: 404 })
    }
    return NextResponse.json(result, {
      status: 200,
      // Ergebnisse sind zustandsabhaengig und duerfen nie zwischengespeichert werden.
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    console.log("[v0] catalyst session pull failed:", (error as Error).message)
    return NextResponse.json({ error: "Abruf fehlgeschlagen." }, { status: 500 })
  }
}

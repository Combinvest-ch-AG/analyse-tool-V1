/**
 * POST /api/integration/v1/sessions
 *
 * Von Catalyst aufgerufen, um eine Analyse-Sitzung zu eroeffnen. Antwortet mit
 * dem Deep-Link, den Catalyst dem Berater oeffnet (analog zur frueheren
 * Riskine-Redirect-URL).
 *
 * Idempotent ueber `externalId`.
 */

import { NextResponse } from "next/server"
import { getCatalystConfig, isCatalystReady } from "@/lib/integration/catalyst/config"
import { verifyInboundBearer } from "@/lib/integration/catalyst/auth"
import { sessionCreateInputSchema, CONTRACT_VERSION } from "@/lib/integration/catalyst/contract"
import { createCatalystSession } from "@/lib/integration/catalyst/service"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const config = getCatalystConfig()

  // Solange die Integration nicht aktiv ist, existiert der Endpunkt nicht.
  if (!isCatalystReady(config)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (!verifyInboundBearer(request.headers.get("authorization"), config.inboundToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "Ungueltiges JSON." }, { status: 400 })
  }

  const parsed = sessionCreateInputSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validierung fehlgeschlagen.", issues: parsed.error.flatten() },
      { status: 422 },
    )
  }

  try {
    const result = await createCatalystSession(parsed.data)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json(
      {
        url: result.url,
        externalId: result.externalId,
        analysisId: result.analysisId,
        customerId: result.customerId,
        expiresAt: result.expiresAt,
        contractVersion: CONTRACT_VERSION,
      },
      { status: 201 },
    )
  } catch (error) {
    console.log("[v0] catalyst session create failed:", (error as Error).message)
    return NextResponse.json({ error: "Sitzung konnte nicht erstellt werden." }, { status: 500 })
  }
}

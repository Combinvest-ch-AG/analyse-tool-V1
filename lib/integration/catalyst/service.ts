/**
 * Fachlogik der Catalyst-Integration.
 *
 * Laeuft ausschliesslich mit der Service-Role (die Endpunkte sind maschinen-
 * authentifiziert, es gibt keine Benutzersession). Jede Abfrage filtert daher
 * explizit auf organization_id — RLS greift hier nicht.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { CONTRACT_VERSION, type SessionCreateInput, type SessionResult } from "./contract"
import { createDeeplinkToken } from "./auth"
import { getCatalystConfig } from "./config"
import { mapLegacyRiskineContact, mapLegacyRiskineInput } from "./legacy-riskine"
import { AREAS, needScore, progressPercent, scores, type WizardAnswers } from "@/lib/wizard/schema"

type Admin = ReturnType<typeof createAdminClient>

export type SessionCreateResult =
  | {
      ok: true
      externalId: string
      analysisId: string
      customerId: string
      url: string
      expiresAt: string
    }
  | { ok: false; error: string; status: number }

/** Loest den Berater ueber die E-Mail auf — die Bruecke zwischen den Systemen. */
async function resolveAdvisor(admin: Admin, email: string) {
  const { data, error } = await admin
    .from("advisor_profiles")
    .select("id, organization_id, email, active")
    .eq("email", email)
    .eq("active", true)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Findet den Kunden ueber catalyst_client_id oder verknuepft einen bestehenden
 * Kunden anhand der E-Mail. Erst wenn beides fehlschlaegt, wird neu angelegt.
 */
async function resolveCustomer(
  admin: Admin,
  organizationId: string,
  contact: SessionCreateInput["contact"],
  legacyFallback: ReturnType<typeof mapLegacyRiskineContact>,
) {
  const byClientId = await admin
    .from("customers")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("catalyst_client_id", contact.id)
    .maybeSingle()
  if (byClientId.error) throw byClientId.error

  const patch = {
    catalyst_client_id: contact.id,
    first_name: contact.firstName ?? legacyFallback.firstName ?? null,
    last_name: contact.lastName ?? legacyFallback.lastName ?? null,
    company_name: contact.companyName ?? null,
    email: contact.email ?? null,
    phone: contact.phone ?? null,
    birthdate: contact.birthdate ?? legacyFallback.birthdate ?? null,
    gender: contact.gender ?? null,
    salutation: contact.salutation ?? null,
    street: contact.street ?? legacyFallback.street ?? null,
    house_number: contact.houseNumber ?? legacyFallback.houseNumber ?? null,
    postcode: contact.postcode ?? legacyFallback.postcode ?? null,
    city: contact.city ?? null,
    country_code: contact.countryCode ?? null,
    preferred_language: contact.preferredLanguage ?? null,
    monthly_income: contact.monthlyIncome ?? null,
  }
  // Leere Felder nicht ueber bestehende Daten schreiben.
  const cleaned = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== null && value !== undefined),
  )

  if (byClientId.data) {
    const { error } = await admin.from("customers").update(cleaned).eq("id", byClientId.data.id)
    if (error) throw error
    return byClientId.data.id as string
  }

  // Noch nicht verknuepft: bestehenden Kunden per E-Mail adoptieren.
  if (contact.email) {
    const byEmail = await admin
      .from("customers")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("email", contact.email)
      .is("catalyst_client_id", null)
      .maybeSingle()
    if (byEmail.error) throw byEmail.error
    if (byEmail.data) {
      const { error } = await admin.from("customers").update(cleaned).eq("id", byEmail.data.id)
      if (error) throw error
      return byEmail.data.id as string
    }
  }

  const { data, error } = await admin
    .from("customers")
    .insert({
      organization_id: organizationId,
      customer_type: contact.companyName ? "company" : "private",
      status: "active",
      source: "catalyst",
      ...cleaned,
    })
    .select("id")
    .single()
  if (error) throw error
  return data.id as string
}

/** Baut den Deep-Link und persistiert nur den Token-Hash. */
function buildDeeplink(externalId: string) {
  const config = getCatalystConfig()
  const { token, tokenHash } = createDeeplinkToken(externalId, config.deeplinkSecret)
  const url = `${config.appUrl}/api/integration/enter?token=${encodeURIComponent(token)}`
  const expiresAt = new Date(Date.now() + config.deeplinkTtlMinutes * 60_000).toISOString()
  return { url, tokenHash, expiresAt }
}

/**
 * Idempotenter Einstiegspunkt. Gleiche externalId => gleiche Analyse, aber
 * immer ein frischer Deep-Link (das alte Token wird entwertet).
 */
export async function createCatalystSession(
  input: SessionCreateInput,
): Promise<SessionCreateResult> {
  const admin = createAdminClient()

  const advisor = await resolveAdvisor(admin, input.advisor.email)
  if (!advisor) {
    return {
      ok: false,
      status: 409,
      error: `Kein aktives Beraterprofil fuer ${input.advisor.email} gefunden.`,
    }
  }
  const organizationId = advisor.organization_id as string

  const legacyContact = mapLegacyRiskineContact(input.legacy?.input)
  const customerId = await resolveCustomer(admin, organizationId, input.contact, legacyContact)

  // Bestehende Session derselben externalId wiederverwenden.
  const existing = await admin
    .from("catalyst_sessions")
    .select("id, analysis_id")
    .eq("external_id", input.externalId)
    .maybeSingle()
  if (existing.error) throw existing.error

  let analysisId = existing.data?.analysis_id as string | null | undefined

  if (!analysisId) {
    // Offene Analyse desselben Kunden wiederverwenden, sonst neu anlegen.
    const open = await admin
      .from("analyses")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("customer_id", customerId)
      .eq("status", "in_progress")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (open.error) throw open.error

    if (open.data) {
      analysisId = open.data.id as string
    } else {
      const legacyAnswers = mapLegacyRiskineInput(input.legacy?.input)
      const snapshot: Record<string, unknown> = {}
      if (legacyAnswers.mappedCount > 0) snapshot.answers = legacyAnswers.answers
      if (legacyAnswers.unmapped.length > 0) {
        // Transparenz: was aus dem Altbestand nicht interpretierbar war.
        snapshot.legacyImport = {
          source: "riskine",
          unmapped: legacyAnswers.unmapped,
          importedAt: new Date().toISOString(),
        }
      }

      const created = await admin
        .from("analyses")
        .insert({
          organization_id: organizationId,
          customer_id: customerId,
          advisor_id: advisor.id,
          status: "in_progress",
          source: "catalyst",
          title: "Analyse aus Catalyst",
          legacy_external_id: input.externalId,
          legacy_party_id: input.legacy?.partyId ?? null,
          legacy_advice_id: input.legacy?.adviceId ?? null,
          legacy_riskine_record_id: input.legacy?.recordId ?? null,
          catalyst_data_collection_id: input.dataCollectionId ?? null,
          latest_snapshot: snapshot,
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single()
      if (created.error) throw created.error
      analysisId = created.data.id as string
    }
  }

  const { url, tokenHash, expiresAt } = buildDeeplink(input.externalId)

  const row = {
    external_id: input.externalId,
    catalyst_client_id: input.contact.id,
    catalyst_data_collection_id: input.dataCollectionId ?? null,
    organization_id: organizationId,
    customer_id: customerId,
    analysis_id: analysisId,
    advisor_email: input.advisor.email,
    catalyst_seller_id: input.advisor.sellerId ?? null,
    callback_url: input.callbackUrl,
    prefill: { contact: input.contact, advisor: input.advisor, brand: input.brand ?? null },
    token_hash: tokenHash,
    token_consumed_at: null,
    expires_at: expiresAt,
    status: "pending",
    last_error: null,
  }

  const { error: upsertError } = await admin
    .from("catalyst_sessions")
    .upsert(row, { onConflict: "external_id" })
  if (upsertError) throw upsertError

  return {
    ok: true,
    externalId: input.externalId,
    analysisId: analysisId as string,
    customerId,
    url,
    expiresAt,
  }
}

/** Liest den vollen Ergebnis-Payload fuer den Pull durch Catalyst. */
export async function buildSessionResult(externalId: string): Promise<SessionResult | null> {
  const admin = createAdminClient()

  const session = await admin
    .from("catalyst_sessions")
    .select(
      "external_id, catalyst_client_id, organization_id, customer_id, analysis_id, advisor_email, catalyst_seller_id, status, updated_at",
    )
    .eq("external_id", externalId)
    .maybeSingle()
  if (session.error) throw session.error
  if (!session.data || !session.data.analysis_id) return null

  const analysis = await admin
    .from("analyses")
    .select("id, status, latest_snapshot, lock_version, started_at, completed_at, updated_at")
    .eq("id", session.data.analysis_id)
    .maybeSingle()
  if (analysis.error) throw analysis.error
  if (!analysis.data) return null

  const snapshot = (analysis.data.latest_snapshot ?? {}) as {
    answers?: WizardAnswers
    contracts?: Record<string, unknown>
    themeStatus?: Record<string, string>
    notes?: Record<string, string>
    closing?: Record<string, unknown>
    documents?: { id?: string; title?: string; path?: string; createdAt?: string }[]
  }
  const answers = snapshot.answers ?? {}
  const areaScores = scores(answers)

  // Signierte, kurzlebige Download-Links fuer die Dokumente erzeugen.
  const documents: SessionResult["documents"] = []
  for (const doc of snapshot.documents ?? []) {
    let downloadUrl: string | null = null
    if (doc.path) {
      const signed = await admin.storage
        .from("analysis-documents")
        .createSignedUrl(doc.path, 60 * 60)
      downloadUrl = signed.data?.signedUrl ?? null
    }
    documents.push({
      id: doc.id ?? doc.path ?? "unbekannt",
      title: doc.title ?? "Dokument",
      downloadUrl,
      mimeType: "application/pdf",
      createdAt: doc.createdAt ?? null,
    })
  }

  const prioritization = Object.fromEntries(
    AREAS.map((area) => [area.key, Math.round(areaScores[area.key] ?? 0)]),
  ) as SessionResult["result"]["prioritization"]

  return {
    externalId: session.data.external_id as string,
    contractVersion: CONTRACT_VERSION,
    status: session.data.status as SessionResult["status"],
    analysisId: analysis.data.id as string,
    customerId: session.data.customer_id as string,
    catalystClientId: session.data.catalyst_client_id as string,
    revision: Number(analysis.data.lock_version ?? 0),
    startedAt: (analysis.data.started_at as string | null) ?? null,
    completedAt: (analysis.data.completed_at as string | null) ?? null,
    updatedAt: (analysis.data.updated_at as string) ?? new Date().toISOString(),
    advisor: {
      email: session.data.advisor_email as string,
      sellerId: (session.data.catalyst_seller_id as string | null) ?? null,
    },
    input: answers as Record<string, unknown>,
    result: {
      progressPercent: progressPercent(answers),
      needScore: needScore(answers),
      prioritization,
      themeStatus: snapshot.themeStatus ?? {},
    },
    notes: snapshot.notes ?? {},
    contracts: snapshot.contracts ?? {},
    closing: snapshot.closing ?? null,
    documents,
  }
}

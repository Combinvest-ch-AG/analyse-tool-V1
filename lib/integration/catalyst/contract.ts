/**
 * SSOT des Integrationsvertrags zwischen Catalyst und dem Analyse-Tool.
 *
 * Version v1. Aenderungen sind additiv vorzunehmen; ein Bruch erfordert einen
 * neuen Pfad (/api/integration/v2/...), damit Catalyst nie ueberrascht wird.
 *
 * Ablauf (Ping-dann-Pull, uebernommen von der bewaehrten Riskine-Mechanik):
 *   1. Catalyst  -> POST /api/integration/v1/sessions            (Bearer)
 *   2. Berater   -> GET  /api/integration/enter?token=...        (Deep-Link)
 *   3. wir       -> POST {callbackUrl}                           (HMAC, nur Ping)
 *   4. Catalyst  -> GET  /api/integration/v1/sessions/{id}       (Bearer, Pull)
 */

import { z } from "zod"

export const CONTRACT_VERSION = "v1" as const

/** Themen-Schluessel. Bewusst identisch zu Riskines `risks.prioritization`. */
export const AREA_KEYS = [
  "health",
  "pensiongap",
  "investment",
  "real-estate",
  "values-protection",
  "children",
  "property-creation",
  "tax-advantage",
] as const

export const areaKeySchema = z.enum(AREA_KEYS)

const trimmed = z.string().trim()
const optionalText = trimmed.min(1).optional()

/** Eine E-Mail ist die Berater-Bruecke zwischen beiden Systemen. */
const emailSchema = trimmed.toLowerCase().email()

export const catalystContactSchema = z
  .object({
    /** Catalyst clients.id — fachlicher Schluessel des Kontakts. */
    id: trimmed.min(1),
    firstName: optionalText,
    lastName: optionalText,
    companyName: optionalText,
    email: emailSchema.optional(),
    phone: optionalText,
    /** ISO-Datum (YYYY-MM-DD). */
    birthdate: trimmed.regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    gender: z.enum(["m", "w", "divers"]).optional(),
    salutation: optionalText,
    street: optionalText,
    houseNumber: optionalText,
    postcode: optionalText,
    city: optionalText,
    countryCode: trimmed.length(2).toUpperCase().optional(),
    preferredLanguage: z.enum(["de", "fr", "it", "en"]).optional(),
    monthlyIncome: z.coerce.number().nonnegative().optional(),
  })
  .strict()

export const catalystAdvisorSchema = z
  .object({
    /** Pflicht: darueber ordnen wir das advisor_profile zu. */
    email: emailSchema,
    /** Catalyst sellers.id — nur zur Protokollierung. */
    sellerId: optionalText,
    firstName: optionalText,
    lastName: optionalText,
    finmaRegistryNumber: optionalText,
    phone: optionalText,
  })
  .strict()

export const catalystBrandSchema = z
  .object({
    organizationName: optionalText,
    logoUrl: trimmed.url().optional(),
    finmaRegistryNumber: optionalText,
  })
  .strict()

/**
 * Bonus-Pfad: Catalyst darf eine alte Riskine-Advisory mitschicken. Wir mappen
 * die dotted-keys bestmoeglich auf unsere Antworten (siehe legacy-riskine.ts).
 * Absichtlich `passthrough`, weil das Fremdschema flach und breit ist.
 */
export const legacyRiskineSchema = z
  .object({
    input: z.record(z.string(), z.unknown()).optional(),
    partyId: optionalText,
    adviceId: optionalText,
    recordId: optionalText,
  })
  .passthrough()

export const sessionCreateInputSchema = z
  .object({
    /** Von Catalyst vergebene Korrelations-ID. Idempotenzschluessel. */
    externalId: trimmed.min(8).max(200),
    contact: catalystContactSchema,
    advisor: catalystAdvisorSchema,
    brand: catalystBrandSchema.optional(),
    /** Rueckkanal. Wir pingen diese URL bei Speichern/Abschluss. */
    callbackUrl: trimmed.url(),
    /** Catalyst data_collection-Zeile, falls vorhanden. */
    dataCollectionId: optionalText,
    legacy: legacyRiskineSchema.optional(),
  })
  .strict()

export type SessionCreateInput = z.infer<typeof sessionCreateInputSchema>

export const sessionCreateOutputSchema = z
  .object({
    /** Deep-Link fuer den Berater. Einmal-Token, kurzlebig. */
    url: trimmed.url(),
    externalId: trimmed,
    analysisId: trimmed.uuid(),
    customerId: trimmed.uuid(),
    expiresAt: trimmed,
    contractVersion: z.literal(CONTRACT_VERSION),
  })
  .strict()

export type SessionCreateOutput = z.infer<typeof sessionCreateOutputSchema>

/** Ereignisse, die wir an Catalyst melden. Der Ping enthaelt keine Fachdaten. */
export const catalystEventSchema = z
  .object({
    externalId: trimmed.min(1),
    event: z.enum(["opened", "saved", "completed"]),
    analysisId: trimmed.uuid(),
    /** Monoton steigend (lock_version) — erlaubt Catalyst Dedup. */
    revision: z.coerce.number().int().nonnegative(),
    occurredAt: trimmed,
    contractVersion: z.literal(CONTRACT_VERSION),
  })
  .strict()

export type CatalystEvent = z.infer<typeof catalystEventSchema>

/** Ergebnis-Payload, den Catalyst abholt. */
export const sessionResultSchema = z
  .object({
    externalId: z.string(),
    contractVersion: z.literal(CONTRACT_VERSION),
    status: z.enum(["pending", "opened", "saved", "completed", "failed"]),
    analysisId: z.string(),
    customerId: z.string(),
    catalystClientId: z.string(),
    revision: z.number(),
    startedAt: z.string().nullable(),
    completedAt: z.string().nullable(),
    updatedAt: z.string(),
    advisor: z.object({ email: z.string(), sellerId: z.string().nullable() }),
    /** Erfasste Antworten, flach nach Frage-ID. */
    input: z.record(z.string(), z.unknown()),
    result: z.object({
      progressPercent: z.number(),
      needScore: z.number(),
      /** Themen-Prioritaeten 0..100, Riskine-kompatible Keys. */
      prioritization: z.record(areaKeySchema, z.number()),
      themeStatus: z.record(z.string(), z.string()),
    }),
    /** Beratungsnotizen je Thema. */
    notes: z.record(z.string(), z.string()),
    contracts: z.record(z.string(), z.unknown()),
    closing: z.record(z.string(), z.unknown()).nullable(),
    documents: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        /** Kurzlebige signierte URL. Catalyst laedt sie in die Kontakt-Ablage. */
        downloadUrl: z.string().nullable(),
        mimeType: z.string(),
        createdAt: z.string().nullable(),
      }),
    ),
  })
  .strict()

export type SessionResult = z.infer<typeof sessionResultSchema>

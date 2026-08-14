"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentAdvisor } from "@/lib/auth/advisor"
import { notifyCatalyst } from "@/lib/integration/catalyst/notify"

/**
 * Meldet einen Meilenstein an Catalyst, ohne die Antwort an den Berater zu
 * verzoegern. Bewusst nur bei Meilensteinen (Abschluss / Revisions-Punkt):
 * hochfrequente Autosaves wuerden Catalyst sonst mit Pings ueberfluten.
 * Ist die Analyse nicht mit Catalyst verknuepft, verpufft der Aufruf still.
 */
function notifyCatalystMilestone(
  analysisId: string,
  opts: { complete?: boolean; writeRevision?: boolean },
) {
  if (!opts.complete && !opts.writeRevision) return
  after(async () => {
    await notifyCatalyst(analysisId, opts.complete ? "completed" : "saved")
  })
}

export type CreateCustomerResult =
  | { ok: true; customerId: string; analysisId: string }
  | { ok: false; error: string }

export async function createCustomerAndAnalysis(input: {
  firstName: string
  lastName: string
  birthdate?: string
  email?: string
  phone?: string
  postcode?: string
  city?: string
}): Promise<CreateCustomerResult> {
  const advisor = await getCurrentAdvisor()
  if (!advisor) return { ok: false, error: "Nicht angemeldet." }

  const firstName = input.firstName?.trim()
  const lastName = input.lastName?.trim()
  if (!firstName || !lastName) {
    return { ok: false, error: "Vor- und Nachname sind erforderlich." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("create_customer_with_analysis", {
    p_first_name: firstName,
    p_last_name: lastName,
    p_birthdate: input.birthdate || null,
    p_email: input.email || null,
    p_phone: input.phone || null,
    p_postcode: input.postcode || null,
    p_city: input.city || null,
  })

  if (error) return { ok: false, error: error.message }

  const row = Array.isArray(data) ? data[0] : data
  if (!row?.customer_id || !row?.analysis_id) {
    return { ok: false, error: "Unerwartete Antwort vom Server." }
  }

  revalidatePath("/dashboard")
  return { ok: true, customerId: row.customer_id, analysisId: row.analysis_id }
}

export type StartAnalysisResult =
  | { ok: true; analysisId: string }
  | { ok: false; error: string }

export async function startCustomerAnalysis(customerId: string): Promise<StartAnalysisResult> {
  const advisor = await getCurrentAdvisor()
  if (!advisor) return { ok: false, error: "Nicht angemeldet." }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("start_customer_analysis", {
    p_customer_id: customerId,
  })
  if (error) return { ok: false, error: error.message }

  const analysisId = typeof data === "string" ? data : (data as { id?: string })?.id
  if (!analysisId) return { ok: false, error: "Analyse konnte nicht gestartet werden." }

  revalidatePath(`/kunde/${customerId}`)
  return { ok: true, analysisId }
}

export type SaveSnapshotResult =
  | { ok: true; lockVersion: number; completed: boolean }
  | { ok: false; error: string; conflict?: boolean }

/** Reads the current optimistic lock_version for conflict reconciliation. */
export async function getAnalysisLockVersion(analysisId: string): Promise<number | null> {
  try {
    const advisor = await getCurrentAdvisor()
    if (!advisor) return null
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("analyses")
      .select("lock_version")
      .eq("id", analysisId)
      .maybeSingle()
    if (error || !data) return null
    return Number((data as { lock_version: number | string }).lock_version)
  } catch {
    return null
  }
}

type AnalysisSnapshotRow = {
  lock_version: number | string
  current_step: number | string | null
  current_question: number | string | null
  progress_percent: number | string | null
  latest_snapshot: Record<string, unknown> | null
}

type SnapshotMutationResult =
  | { ok: true; lockVersion: number; savedAt: string; completed: boolean }
  | { ok: false; error: string; conflict?: boolean }

/**
 * Single persistence gateway for every analysis section outside the wizard.
 *
 * It always reads the latest snapshot, applies the requested merge and writes
 * it through the same optimistic-locking RPC as the wizard. A concurrent write
 * gets one bounded retry with a fresh snapshot, so two advisor actions cannot
 * silently overwrite each other and no retry loop can hammer Supabase.
 */
async function mutateAnalysisSnapshot(input: {
  analysisId: string
  mutate: (current: Record<string, unknown>, savedAt: string) => Record<string, unknown>
  complete?: boolean
  writeRevision?: boolean
  revalidate?: string[]
}): Promise<SnapshotMutationResult> {
  try {
    const advisor = await getCurrentAdvisor()
    if (!advisor) return { ok: false, error: "Nicht angemeldet." }

    const supabase = await createClient()
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { data, error: readError } = await supabase
        .from("analyses")
        .select("lock_version,current_step,current_question,progress_percent,latest_snapshot")
        .eq("id", input.analysisId)
        .maybeSingle()

      const row = data as AnalysisSnapshotRow | null
      if (readError || !row) {
        return { ok: false, error: readError?.message ?? "Analyse nicht gefunden oder nicht freigegeben." }
      }

      const savedAt = new Date().toISOString()
      const current = row.latest_snapshot ?? {}
      const snapshot = input.mutate(current, savedAt)
      const { data: saved, error } = await supabase.rpc("save_analysis_snapshot", {
        p_analysis_id: input.analysisId,
        p_expected_lock_version: Number(row.lock_version),
        p_step: Number(row.current_step ?? 3),
        p_question: Number(row.current_question ?? 0),
        p_progress: input.complete ? 100 : Number(row.progress_percent ?? 0),
        p_snapshot: snapshot,
        p_complete: input.complete ?? false,
        p_write_revision: input.writeRevision ?? false,
      })

      if (error) return { ok: false, error: error.message }
      const savedRow = (Array.isArray(saved) ? saved[0] : saved) as { lock_version?: number | string } | null
      if (savedRow) {
        for (const path of input.revalidate ?? []) revalidatePath(path)
        notifyCatalystMilestone(input.analysisId, {
          complete: input.complete,
          writeRevision: input.writeRevision,
        })
        return {
          ok: true,
          lockVersion: Number(savedRow.lock_version ?? Number(row.lock_version) + 1),
          savedAt,
          completed: input.complete ?? false,
        }
      }
      // Empty result means a concurrent save won the optimistic lock. The next
      // iteration rereads and reapplies this mutation to the newest snapshot.
    }
    return { ok: false, error: "Konflikt: Analyse wurde gleichzeitig geändert.", conflict: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Speichern fehlgeschlagen." }
  }
}

export type SaveCalculatorResult =
  | { ok: true; lockVersion: number; savedAt: string }
  | { ok: false; error: string; conflict?: boolean }

/**
 * Merges a calculator result into an existing analysis snapshot under
 * `calculatorResults[key]`, preserving the current step/question/progress.
 * Reads a fresh lock_version right before saving to avoid conflicts.
 */
export async function saveCalculatorResult(input: {
  analysisId: string
  key: string
  payload: Record<string, unknown>
  writeRevision?: boolean
}): Promise<SaveCalculatorResult> {
  const result = await mutateAnalysisSnapshot({
    analysisId: input.analysisId,
    writeRevision: input.writeRevision ?? false,
    revalidate: [`/analyse/${input.analysisId}`],
    mutate: (current, savedAt) => {
      const calculatorResults = { ...((current.calculatorResults as Record<string, unknown>) ?? {}) }
      calculatorResults[input.key] = { ...input.payload, savedAt }
      return { ...current, calculatorResults }
    },
  })
  return result.ok
    ? { ok: true, lockVersion: result.lockVersion, savedAt: result.savedAt }
    : result
}

export type SaveReferralResult = { ok: true } | { ok: false; error: string }

/**
 * Merges the post-advisory referral ("Weiterempfehlung") into the analysis
 * snapshot under `referral`. Passing an empty object clears it (reset).
 */
export async function saveReferral(input: {
  analysisId: string
  payload: Record<string, unknown>
  writeRevision?: boolean
}): Promise<SaveReferralResult> {
  const hasData = Object.keys(input.payload).length > 0
  const result = await mutateAnalysisSnapshot({
    analysisId: input.analysisId,
    writeRevision: input.writeRevision ?? true,
    revalidate: [`/analyse/${input.analysisId}/empfehlung`],
    mutate: (current, savedAt) => ({
      ...current,
      referral: hasData ? { ...input.payload, updatedAt: savedAt } : null,
    }),
  })
  return result.ok ? { ok: true } : result
}

export type SaveNotesResult = { ok: true; savedAt: string } | { ok: false; error: string; conflict?: boolean }

/**
 * Persists per-appointment advisor notes into the analysis snapshot under
 * `notes`, keyed by topic (e.g. "general", "health", "pensiongap"). The full
 * topic→text map is written on each save; empty strings are kept so a cleared
 * field round-trips. Uses the shared optimistic-locking gateway so notes can be
 * edited alongside the wizard without clobbering concurrent snapshot writes.
 */
export async function saveNotes(input: {
  analysisId: string
  notes: Record<string, string>
  writeRevision?: boolean
}): Promise<SaveNotesResult> {
  const result = await mutateAnalysisSnapshot({
    analysisId: input.analysisId,
    writeRevision: input.writeRevision ?? false,
    revalidate: [`/analyse/${input.analysisId}`],
    mutate: (current, savedAt) => ({
      ...current,
      notes: { ...input.notes, updatedAt: savedAt },
    }),
  })
  return result.ok ? { ok: true, savedAt: result.savedAt } : result
}

export type SaveDocumentsResult = { ok: true } | { ok: false; error: string }

/**
 * Stores the generated document package summary into the analysis snapshot
 * under `documents`, so the closing step can reflect that documents exist.
 */
export async function saveDocuments(input: {
  analysisId: string
  documents: Record<string, unknown>
  writeRevision?: boolean
}): Promise<SaveDocumentsResult> {
  const result = await mutateAnalysisSnapshot({
    analysisId: input.analysisId,
    writeRevision: input.writeRevision ?? true,
    revalidate: [`/analyse/${input.analysisId}/abschluss`],
    mutate: (current, savedAt) => ({
      ...current,
      documents: {
        ...(current.documents as Record<string, unknown> | undefined),
        ...input.documents,
        savedAt,
      },
    }),
  })
  return result.ok ? { ok: true } : result
}

export type SaveClosingResult = { ok: true; completed: boolean } | { ok: false; error: string }

/**
 * Persists the advisory closing step (next appointment + final confirmations)
 * into the analysis snapshot under `closing`. When `complete` is true the
 * analysis is marked completed via the RPC.
 */
export async function saveClosing(input: {
  analysisId: string
  closing: Record<string, unknown>
  complete?: boolean
  writeRevision?: boolean
}): Promise<SaveClosingResult> {
  const result = await mutateAnalysisSnapshot({
    analysisId: input.analysisId,
    complete: input.complete,
    writeRevision: input.complete ? true : (input.writeRevision ?? true),
    revalidate: [`/analyse/${input.analysisId}/abschluss`, `/analyse/${input.analysisId}`],
    mutate: (current, savedAt) => ({
      ...current,
      closing: {
        ...(current.closing as Record<string, unknown> | undefined),
        ...input.closing,
        completedAt: input.complete
          ? savedAt
          : ((current.closing as Record<string, unknown> | undefined)?.completedAt ?? null),
        updatedAt: savedAt,
      },
    }),
  })
  return result.ok ? { ok: true, completed: result.completed } : result
}

/**
 * Persists a wizard snapshot via the optimistic-locking RPC. The client passes
 * the lock_version it last saw; a mismatch raises 40001, which the caller
 * reconciles via getAnalysisLockVersion and one retry.
 */
export async function saveAnalysisSnapshot(input: {
  analysisId: string
  expectedLockVersion: number
  step: number
  question: number
  progress: number
  snapshot: Record<string, unknown>
  complete?: boolean
  /**
   * Whether to persist an immutable revision alongside the snapshot. High
   * frequency autosaves pass false to avoid revision churn (which triggered
   * heavy DB write/index load); milestones (step change, completion) pass true.
   */
  writeRevision?: boolean
}): Promise<SaveSnapshotResult> {
  try {
    const advisor = await getCurrentAdvisor()
    if (!advisor) return { ok: false, error: "Nicht angemeldet." }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc("save_analysis_snapshot", {
      p_analysis_id: input.analysisId,
      p_expected_lock_version: input.expectedLockVersion,
      p_step: input.step,
      p_question: input.question,
      p_progress: input.progress,
      p_snapshot: input.snapshot,
      p_complete: input.complete ?? false,
      p_write_revision: input.writeRevision ?? false,
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    // The RPC returns SETOF analyses: exactly one row on success, ZERO rows on
    // a lock conflict / RLS-forbidden row. It no longer raises on conflict, so
    // an empty result — not an error code — signals a conflict. This keeps the
    // transaction committed (no rollback storm) even when clients retry.
    const row = (Array.isArray(data) ? data[0] : data) as { lock_version?: number | string } | null
    if (!row) {
      return { ok: false, error: "Konflikt: Analyse wurde zwischenzeitlich geändert.", conflict: true }
    }

    const nextVersion = Number(row.lock_version ?? input.expectedLockVersion + 1)

    if (input.complete) revalidatePath(`/analyse/${input.analysisId}`)
    notifyCatalystMilestone(input.analysisId, {
      complete: input.complete,
      writeRevision: input.writeRevision,
    })
    return { ok: true, lockVersion: nextVersion, completed: input.complete ?? false }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Speichern fehlgeschlagen." }
  }
}

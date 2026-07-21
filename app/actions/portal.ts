"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentAdvisor } from "@/lib/auth/advisor"

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

export type SaveCalculatorResult = { ok: true } | { ok: false; error: string }

/**
 * Merges a calculator result into an existing analysis snapshot under
 * `calculatorResults[key]`, preserving the current step/question/progress.
 * Reads a fresh lock_version right before saving to avoid conflicts.
 */
export async function saveCalculatorResult(input: {
  analysisId: string
  key: string
  payload: Record<string, unknown>
}): Promise<SaveCalculatorResult> {
  try {
    const advisor = await getCurrentAdvisor()
    if (!advisor) return { ok: false, error: "Nicht angemeldet." }

    const supabase = await createClient()
    const { data: row, error: readErr } = await supabase
      .from("analyses")
      .select("lock_version,current_step,current_question,progress_percent,latest_snapshot")
      .eq("id", input.analysisId)
      .maybeSingle()
    if (readErr || !row) return { ok: false, error: readErr?.message ?? "Analyse nicht gefunden." }

    const current = (row.latest_snapshot as Record<string, unknown> | null) ?? {}
    const calcResults = { ...((current.calculatorResults as Record<string, unknown>) ?? {}) }
    calcResults[input.key] = { ...input.payload, savedAt: new Date().toISOString() }
    const snapshot = { ...current, calculatorResults: calcResults }

    const { error } = await supabase.rpc("save_analysis_snapshot", {
      p_analysis_id: input.analysisId,
      p_expected_lock_version: Number(row.lock_version),
      p_step: Number(row.current_step ?? 3),
      p_question: Number(row.current_question ?? 0),
      p_progress: Number(row.progress_percent ?? 0),
      p_snapshot: snapshot,
      p_complete: false,
    })
    if (error) return { ok: false, error: error.message }

    revalidatePath(`/analyse/${input.analysisId}`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Übernahme fehlgeschlagen." }
  }
}

export type SaveReferralResult = { ok: true } | { ok: false; error: string }

/**
 * Merges the post-advisory referral ("Weiterempfehlung") into the analysis
 * snapshot under `referral`. Passing an empty object clears it (reset).
 */
export async function saveReferral(input: {
  analysisId: string
  payload: Record<string, unknown>
}): Promise<SaveReferralResult> {
  try {
    const advisor = await getCurrentAdvisor()
    if (!advisor) return { ok: false, error: "Nicht angemeldet." }

    const supabase = await createClient()
    const { data: row, error: readErr } = await supabase
      .from("analyses")
      .select("lock_version,current_step,current_question,progress_percent,latest_snapshot")
      .eq("id", input.analysisId)
      .maybeSingle()
    if (readErr || !row) return { ok: false, error: readErr?.message ?? "Analyse nicht gefunden." }

    const current = (row.latest_snapshot as Record<string, unknown> | null) ?? {}
    const hasData = Object.keys(input.payload).length > 0
    const snapshot = {
      ...current,
      referral: hasData ? { ...input.payload, updatedAt: new Date().toISOString() } : null,
    }

    const { error } = await supabase.rpc("save_analysis_snapshot", {
      p_analysis_id: input.analysisId,
      p_expected_lock_version: Number(row.lock_version),
      p_step: Number(row.current_step ?? 3),
      p_question: Number(row.current_question ?? 0),
      p_progress: Number(row.progress_percent ?? 0),
      p_snapshot: snapshot,
      p_complete: false,
    })
    if (error) return { ok: false, error: error.message }

    revalidatePath(`/analyse/${input.analysisId}/empfehlung`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Speichern fehlgeschlagen." }
  }
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
    })

    if (error) {
      // 40001 (serialization_failure) is raised by the RPC on a lock mismatch
      // or an RLS-forbidden row.
      const conflict = error.code === "40001" || /lock|version|conflict|forbidden|stale/i.test(error.message)
      return { ok: false, error: error.message, conflict }
    }

    // RPC RETURNS the full analyses row; read the new lock_version off it.
    const row = (Array.isArray(data) ? data[0] : data) as { lock_version?: number | string } | null
    const nextVersion = Number(row?.lock_version ?? input.expectedLockVersion + 1)

    if (input.complete) revalidatePath(`/analyse/${input.analysisId}`)
    return { ok: true, lockVersion: nextVersion, completed: input.complete ?? false }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Speichern fehlgeschlagen." }
  }
}

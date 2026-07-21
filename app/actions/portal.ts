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

/**
 * Persists a wizard snapshot via the optimistic-locking RPC. The client passes
 * the lock_version it last saw; a mismatch means another writer advanced the
 * row and the caller must reload.
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
    const conflict = /lock|version|conflict|stale/i.test(error.message)
    return { ok: false, error: error.message, conflict }
  }

  // RPC returns the new lock_version (bigint). Normalize to number.
  const row = Array.isArray(data) ? data[0] : data
  const nextVersion =
    typeof row === "number"
      ? row
      : Number(row?.lock_version ?? input.expectedLockVersion + 1)

  return { ok: true, lockVersion: nextVersion, completed: input.complete ?? false }
}

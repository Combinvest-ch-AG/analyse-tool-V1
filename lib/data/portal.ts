import "server-only"
import { createClient } from "@/lib/supabase/server"

// ---------------------------------------------------------------------------
// Row types (subset of the live schema; see types/combinvest.ts for the rich
// domain model used inside analysis snapshots).
// ---------------------------------------------------------------------------

export type AnalysisStatus = "draft" | "in_progress" | "completed" | "cancelled"

export type CustomerRow = {
  id: string
  first_name: string
  last_name: string
  birthdate: string | null
  gender: string | null
  email: string | null
  phone: string | null
  postcode: string | null
  city: string | null
  monthly_income: number | null
  preferred_language: string | null
  status: string | null
  created_at: string
  updated_at: string
}

export type AnalysisRow = {
  id: string
  customer_id: string
  title: string | null
  status: AnalysisStatus
  current_step: number | null
  current_question: number | null
  progress_percent: number | null
  latest_snapshot: Record<string, unknown> | null
  lock_version: number
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type AppointmentRow = {
  id: string
  customer_id: string
  title: string
  appointment_type: string | null
  starts_at: string
  ends_at: string | null
  status: string | null
  location: string | null
}

export type ContractRow = {
  id: string
  customer_id: string
  policy_number: string | null
  contract_type: string | null
  provider_name: string | null
  gross_premium: number | null
  premium_interval: string | null
  status: string | null
  start_date: string | null
  expiry_date: string | null
}

const CUSTOMER_COLUMNS =
  "id,first_name,last_name,birthdate,gender,email,phone,postcode,city,monthly_income,preferred_language,status,created_at,updated_at"
const ANALYSIS_COLUMNS =
  "id,customer_id,title,status,current_step,current_question,progress_percent,latest_snapshot,lock_version,started_at,completed_at,created_at,updated_at"
const CONTRACT_COLUMNS =
  "id,customer_id,policy_number,contract_type,provider_name,gross_premium,premium_interval,status,start_date,expiry_date"

export type DashboardData = {
  customers: CustomerRow[]
  analyses: AnalysisRow[]
}

// Safety cap so list/dashboard queries can never trigger an unbounded scan as
// the organization grows. Far above realistic per-org counts today.
const LIST_LIMIT = 500

/**
 * Loads everything the dashboard and the customer/analysis list pages need.
 * RLS scopes all rows to the advisor's organization, so no explicit advisor
 * filter is required.
 */
export async function getDashboardData(_advisorId: string): Promise<DashboardData> {
  const supabase = await createClient()

  const [customersRes, analysesRes] = await Promise.all([
    supabase
      .from("customers")
      .select(CUSTOMER_COLUMNS)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(LIST_LIMIT),
    supabase
      .from("analyses")
      .select(ANALYSIS_COLUMNS)
      .neq("status", "cancelled")
      .order("updated_at", { ascending: false })
      .limit(LIST_LIMIT),
  ])

  if (customersRes.error) throw customersRes.error
  if (analysesRes.error) throw analysesRes.error

  return {
    customers: (customersRes.data ?? []) as CustomerRow[],
    analyses: (analysesRes.data ?? []) as AnalysisRow[],
  }
}

export type CustomerDetail = {
  customer: CustomerRow
  analyses: AnalysisRow[]
  contracts: ContractRow[]
}

export async function getCustomerDetail(customerId: string): Promise<CustomerDetail | null> {
  const supabase = await createClient()

  const [customerRes, analysesRes, contractsRes] = await Promise.all([
    supabase.from("customers").select(CUSTOMER_COLUMNS).eq("id", customerId).maybeSingle(),
    supabase
      .from("analyses")
      .select(ANALYSIS_COLUMNS)
      .eq("customer_id", customerId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("contracts")
      .select(CONTRACT_COLUMNS)
      .eq("customer_id", customerId)
      .order("updated_at", { ascending: false }),
  ])

  if (customerRes.error) throw customerRes.error
  if (!customerRes.data) return null
  if (analysesRes.error) throw analysesRes.error
  if (contractsRes.error) throw contractsRes.error

  return {
    customer: customerRes.data as CustomerRow,
    analyses: (analysesRes.data ?? []) as AnalysisRow[],
    contracts: (contractsRes.data ?? []) as ContractRow[],
  }
}

export async function getAnalysis(analysisId: string): Promise<AnalysisRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("analyses")
    .select(ANALYSIS_COLUMNS)
    .eq("id", analysisId)
    .maybeSingle()
  if (error) throw error
  return (data as AnalysisRow) ?? null
}

/** Returns one calculator's last persisted payload from an analysis snapshot. */
export function getCalculatorSnapshot(
  analysis: AnalysisRow | null,
  key: string,
): Record<string, unknown> | undefined {
  const snapshot = analysis?.latest_snapshot
  if (!snapshot || typeof snapshot !== "object") return undefined
  const results = snapshot.calculatorResults
  if (!results || typeof results !== "object" || Array.isArray(results)) return undefined
  const value = (results as Record<string, unknown>)[key]
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

export async function getCustomerById(customerId: string): Promise<CustomerRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .eq("id", customerId)
    .maybeSingle()
  if (error) throw error
  return (data as CustomerRow) ?? null
}

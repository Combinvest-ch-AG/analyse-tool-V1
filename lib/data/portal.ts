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
  email: string | null
  phone: string | null
  postcode: string | null
  city: string | null
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
  "id,first_name,last_name,birthdate,email,phone,postcode,city,status,created_at,updated_at"
const ANALYSIS_COLUMNS =
  "id,customer_id,title,status,current_step,current_question,progress_percent,latest_snapshot,lock_version,started_at,completed_at,created_at,updated_at"
const APPOINTMENT_COLUMNS =
  "id,customer_id,title,appointment_type,starts_at,ends_at,status,location"
const CONTRACT_COLUMNS =
  "id,customer_id,policy_number,contract_type,provider_name,gross_premium,premium_interval,status,start_date,expiry_date"

export type DashboardData = {
  customers: CustomerRow[]
  analyses: AnalysisRow[]
  appointments: AppointmentRow[]
}

/**
 * Loads everything the dashboard needs. RLS scopes all rows to the advisor's
 * organization, so no explicit advisor filter is required for customers /
 * analyses; appointments are additionally filtered to the advisor.
 */
export async function getDashboardData(advisorId: string): Promise<DashboardData> {
  const supabase = await createClient()

  const [customersRes, analysesRes, appointmentsRes] = await Promise.all([
    supabase
      .from("customers")
      .select(CUSTOMER_COLUMNS)
      .neq("status", "archived")
      .order("updated_at", { ascending: false }),
    supabase
      .from("analyses")
      .select(ANALYSIS_COLUMNS)
      .neq("status", "cancelled")
      .order("updated_at", { ascending: false }),
    supabase
      .from("appointments")
      .select(APPOINTMENT_COLUMNS)
      .eq("advisor_id", advisorId)
      .order("starts_at", { ascending: true }),
  ])

  if (customersRes.error) throw customersRes.error
  if (analysesRes.error) throw analysesRes.error
  if (appointmentsRes.error) throw appointmentsRes.error

  return {
    customers: (customersRes.data ?? []) as CustomerRow[],
    analyses: (analysesRes.data ?? []) as AnalysisRow[],
    appointments: (appointmentsRes.data ?? []) as AppointmentRow[],
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

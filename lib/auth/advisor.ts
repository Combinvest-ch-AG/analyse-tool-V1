import "server-only"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

export type AdvisorProfile = {
  id: string
  organization_id: string
  email: string
  first_name: string
  last_name: string
  display_name: string
  role: "admin" | "manager" | "advisor" | "backoffice" | "trainee"
  job_title: string | null
  location: string | null
  active: boolean
}

const PROFILE_COLUMNS =
  "id,organization_id,email,first_name,last_name,display_name,role,job_title,location,active"

/**
 * Returns the authenticated advisor's profile, or null if there is no active
 * session / no active advisor profile linked to the auth user.
 */
export const getCurrentAdvisor = cache(async (): Promise<AdvisorProfile | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("advisor_profiles")
    .select(PROFILE_COLUMNS)
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle()

  if (error || !data) return null
  return data as AdvisorProfile
})

export function isManager(profile: AdvisorProfile | null): boolean {
  return profile?.role === "admin" || profile?.role === "manager"
}

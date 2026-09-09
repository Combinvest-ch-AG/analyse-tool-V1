import "server-only"
import { createClient } from "@supabase/supabase-js"

/**
 * Service-role client that BYPASSES Row Level Security.
 * Only use in trusted server code (e.g. the advisor invite flow) AFTER
 * verifying the caller is authorized. Never expose to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}

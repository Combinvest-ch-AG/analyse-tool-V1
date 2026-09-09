import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

/**
 * Handles the PKCE magic-link flow (?code=...) produced by the default
 * Supabase confirmation URL / emailRedirectTo.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Enforce active advisor profile.
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from("advisor_profiles")
        .select("id")
        .eq("auth_user_id", user?.id ?? "")
        .eq("active", true)
        .maybeSingle()

      if (profile) {
        return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/dashboard"}`)
      }
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/auth/error?reason=no_profile`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}

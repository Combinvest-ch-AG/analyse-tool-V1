import { createClient } from "@/lib/supabase/server"
import { type EmailOtpType } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

/**
 * Handles the token-hash magic-link flow used by the custom Combinvest email
 * template: /auth/verify?token_hash=...&type=magiclink
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get("token_hash")
  const type = (searchParams.get("type") ?? "magiclink") as EmailOtpType
  const next = searchParams.get("next") ?? "/dashboard"

  if (tokenHash) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) {
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

"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"

export type RegisterState = {
  status: "idle" | "error"
  message: string
  values?: { firstName: string; lastName: string; email: string }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Only Combinvest advisors may self-register via the shared link.
const ALLOWED_DOMAIN = "combinvest.swiss"
const ORG_SLUG = "combinvest"

function redirectUrl() {
  return (
    process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
    `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`
  )
}

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ")
}

/**
 * Self-service registration for new Combinvest advisors via a shareable link.
 *  - Only @combinvest.swiss addresses are accepted.
 *  - New profiles are created immediately active (role: advisor).
 *  - Existing advisors (including the 32 pre-seeded ones) use the same form;
 *    we detect their profile and just send a fresh login link.
 *  - The DB trigger `on_auth_user_link_advisor` links auth_user_id on first login.
 */
export async function registerAdvisor(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const firstName = titleCase(String(formData.get("firstName") ?? ""))
  const lastName = titleCase(String(formData.get("lastName") ?? ""))
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  const values = { firstName, lastName, email }

  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "Bitte geben Sie eine gültige E-Mail-Adresse ein.", values }
  }
  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    return {
      status: "error",
      message: `Nur E-Mail-Adressen mit @${ALLOWED_DOMAIN} können sich hier registrieren.`,
      values,
    }
  }

  const admin = createAdminClient()

  // Resolve the Combinvest organization.
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", ORG_SLUG)
    .maybeSingle()

  if (orgError || !org) {
    return { status: "error", message: "Registrierung derzeit nicht möglich. Bitte später erneut versuchen.", values }
  }

  // Does a profile already exist for this email?
  const { data: existing } = await admin
    .from("advisor_profiles")
    .select("id, active, first_name, last_name")
    .eq("organization_id", org.id)
    .eq("email", email)
    .maybeSingle()

  if (existing) {
    // Reactivate if needed; keep any name we already have on file.
    if (!existing.active) {
      await admin.from("advisor_profiles").update({ active: true }).eq("id", existing.id)
    }
  } else {
    const { error: insertError } = await admin.from("advisor_profiles").insert({
      organization_id: org.id,
      email,
      first_name: firstName || "Berater",
      last_name: lastName || "Combinvest",
      role: "advisor",
      active: true,
    })
    if (insertError) {
      return { status: "error", message: "Profil konnte nicht angelegt werden. Bitte später erneut versuchen.", values }
    }
  }

  // Send the login link. inviteUserByEmail creates the auth user (which fires
  // the trigger); if the user already exists, fall back to a magic link.
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectUrl(),
  })

  if (inviteError) {
    const msg = inviteError.message?.toLowerCase() ?? ""
    if (msg.includes("already") && msg.includes("regist")) {
      const { error: otpError } = await admin.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: redirectUrl() },
      })
      if (otpError) {
        return { status: "error", message: "Anmeldelink konnte nicht gesendet werden. Bitte später erneut versuchen.", values }
      }
    } else {
      return { status: "error", message: "Registrierung fehlgeschlagen. Bitte später erneut versuchen.", values }
    }
  }

  redirect(`/register/sent?email=${encodeURIComponent(email)}`)
}

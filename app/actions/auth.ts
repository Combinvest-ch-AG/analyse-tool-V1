"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type LoginState = {
  status: "idle" | "error"
  message: string
  email?: string
}

export type VerifyState = {
  status: "idle" | "error"
  message: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function redirectUrl() {
  // In the v0 preview this forwards Supabase auth callbacks to /auth/callback.
  return (
    process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
    `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`
  )
}

function safeNext(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : ""
  // Only allow internal, single-segment-safe paths.
  return /^\/[a-z0-9/_-]*$/i.test(value) ? value : "/dashboard"
}

/**
 * Step 1: advisor enters their email. If the email belongs to an active
 * advisor profile, Supabase sends a magic link + a one-time code
 * (length follows the Supabase email OTP setting, currently 8 digits).
 */
export async function requestLogin(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  const next = safeNext(formData.get("next"))

  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "Bitte geben Sie eine gültige E-Mail-Adresse ein.", email }
  }

  const supabase = await createClient()

  // Gate on an active advisor profile without exposing the directory.
  const { data: canLogin, error: rpcError } = await supabase.rpc("email_can_login", {
    p_email: email,
  })

  if (rpcError) {
    return {
      status: "error",
      message: "Anmeldung derzeit nicht möglich. Bitte versuchen Sie es später erneut.",
      email,
    }
  }

  if (!canLogin) {
    return {
      status: "error",
      message:
        "Für diese E-Mail-Adresse liegt kein aktiver Zugang vor. Bitte wenden Sie sich an Ihre Administration.",
      email,
    }
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: redirectUrl(),
    },
  })

  if (error) {
    return {
      status: "error",
      message: "Der Login-Code konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
      email,
    }
  }

  redirect(`/login/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`)
}

/**
 * Step 2 (alternative to the link): advisor enters the one-time code.
 */
export async function verifyCode(
  _prev: VerifyState,
  formData: FormData,
): Promise<VerifyState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  const token = String(formData.get("token") ?? "").replace(/\D/g, "")
  const next = safeNext(formData.get("next"))

  if (!EMAIL_RE.test(email)) {
    return { status: "error", message: "Sitzung abgelaufen. Bitte fordern Sie einen neuen Code an." }
  }
  if (token.length < 6 || token.length > 10) {
    return { status: "error", message: "Bitte geben Sie den vollständigen Code aus der E-Mail ein." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" })

  if (error) {
    return {
      status: "error",
      message: "Der Code ist ungültig oder abgelaufen. Bitte prüfen Sie die E-Mail oder fordern Sie einen neuen Code an.",
    }
  }

  // Safety net: ensure an active advisor profile is linked.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("advisor_profiles")
    .select("id")
    .eq("auth_user_id", user?.id ?? "")
    .eq("active", true)
    .maybeSingle()

  if (!profile) {
    await supabase.auth.signOut()
    return {
      status: "error",
      message: "Kein aktives Beraterprofil gefunden. Bitte wenden Sie sich an Ihre Administration.",
    }
  }

  redirect(next)
}

/** Resend the login email (magic link + code). */
export async function resendCode(email: string): Promise<{ ok: boolean }> {
  const clean = email.trim().toLowerCase()
  if (!EMAIL_RE.test(clean)) return { ok: false }

  const supabase = await createClient()
  const { data: canLogin } = await supabase.rpc("email_can_login", { p_email: clean })
  if (!canLogin) return { ok: false }

  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: { shouldCreateUser: false, emailRedirectTo: redirectUrl() },
  })
  return { ok: !error }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

"use server"

import { revalidatePath } from "next/cache"
import { getCurrentAdvisor } from "@/lib/auth/advisor"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type InviteResult = {
  email: string
  status: "invited" | "reinvited" | "skipped" | "error"
  message: string
}

export type InviteState = {
  status: "idle" | "done" | "error"
  message: string
  results: InviteResult[]
}

type ParsedInvite = { email: string; firstName: string; lastName: string }

/**
 * Parses the free-form textarea. Accepts one invitee per line in either:
 *   email@domain.ch
 *   Vorname Nachname <email@domain.ch>
 *   email@domain.ch, Vorname, Nachname
 */
function parseInvites(raw: string): ParsedInvite[] {
  const seen = new Set<string>()
  const out: ParsedInvite[] = []

  for (const line of raw.split(/[\n]+/)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    let email = ""
    let firstName = ""
    let lastName = ""

    const angle = trimmed.match(/^(.*?)<([^>]+)>\s*$/)
    if (angle) {
      const name = angle[1].trim().replace(/[",]/g, "").trim()
      email = angle[2].trim().toLowerCase()
      const parts = name.split(/\s+/).filter(Boolean)
      firstName = parts[0] ?? ""
      lastName = parts.slice(1).join(" ")
    } else if (trimmed.includes(",")) {
      const [e, f, l] = trimmed.split(",").map((s) => s.trim())
      email = (e ?? "").toLowerCase()
      firstName = f ?? ""
      lastName = l ?? ""
    } else {
      email = trimmed.toLowerCase()
    }

    if (!EMAIL_RE.test(email) || seen.has(email)) continue
    seen.add(email)

    if (!firstName && !lastName) {
      // Derive a placeholder name from the local part so the profile is valid.
      const local = email.split("@")[0].replace(/[._-]+/g, " ")
      const parts = local.split(/\s+/).filter(Boolean)
      firstName = parts[0] ? parts[0][0].toUpperCase() + parts[0].slice(1) : "Berater"
      lastName = parts[1] ? parts[1][0].toUpperCase() + parts[1].slice(1) : "Combinvest"
    }

    out.push({ email, firstName, lastName })
  }

  return out
}

function redirectUrl() {
  return (
    process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
    `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`
  )
}

export async function inviteAdvisors(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const advisor = await getCurrentAdvisor()
  if (!advisor || (advisor.role !== "admin" && advisor.role !== "manager")) {
    return { status: "error", message: "Nur die Geschäftsleitung darf Einladungen versenden.", results: [] }
  }

  const role = String(formData.get("role") ?? "advisor")
  const validRole = ["advisor", "backoffice", "manager", "trainee"].includes(role) ? role : "advisor"
  const invites = parseInvites(String(formData.get("emails") ?? ""))

  if (invites.length === 0) {
    return { status: "error", message: "Bitte geben Sie mindestens eine gültige E-Mail-Adresse ein.", results: [] }
  }

  const supabase = await createClient()
  const admin = createAdminClient()
  const results: InviteResult[] = []

  for (const invite of invites) {
    // 1. Upsert the advisor profile within the current organization.
    const { error: profileError } = await supabase.from("advisor_profiles").upsert(
      {
        organization_id: advisor.organization_id,
        email: invite.email,
        first_name: invite.firstName,
        last_name: invite.lastName,
        role: validRole,
        active: true,
      },
      { onConflict: "organization_id,email" },
    )

    if (profileError) {
      results.push({ email: invite.email, status: "error", message: "Profil konnte nicht angelegt werden." })
      continue
    }

    // 2. Send the invite email. The invite link logs the advisor straight in.
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(invite.email, {
      redirectTo: redirectUrl(),
    })

    if (inviteError) {
      const msg = inviteError.message?.toLowerCase() ?? ""
      if (msg.includes("already been registered") || msg.includes("already registered")) {
        // User already exists: send a fresh magic link instead.
        const { error: otpError } = await admin.auth.signInWithOtp({
          email: invite.email,
          options: { shouldCreateUser: false, emailRedirectTo: redirectUrl() },
        })
        results.push(
          otpError
            ? { email: invite.email, status: "error", message: "Bereits registriert – erneuter Link fehlgeschlagen." }
            : { email: invite.email, status: "reinvited", message: "Bereits registriert – neuer Anmeldelink gesendet." },
        )
      } else {
        results.push({ email: invite.email, status: "error", message: inviteError.message })
      }
      continue
    }

    results.push({ email: invite.email, status: "invited", message: "Einladung gesendet." })
  }

  revalidatePath("/admin/invitations")

  const ok = results.filter((r) => r.status === "invited" || r.status === "reinvited").length
  return {
    status: "done",
    message: ok > 0 ? `${ok} Einladung(en) versendet.` : "Keine Einladung versendet.",
    results,
  }
}

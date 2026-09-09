import { redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/auth-shell"
import { VerifyForm } from "@/components/auth/verify-form"

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>
}) {
  const { email, next } = await searchParams
  if (!email) redirect("/login")

  const safeNext = next && /^\/[a-z0-9/_-]*$/i.test(next) ? next : "/dashboard"

  return (
    <AuthShell>
      <VerifyForm email={email} next={safeNext} />
    </AuthShell>
  )
}

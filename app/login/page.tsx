import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const safeNext = next && /^\/[a-z0-9/_-]*$/i.test(next) ? next : "/dashboard"

  return (
    <AuthShell>
      <LoginForm next={safeNext} />
    </AuthShell>
  )
}

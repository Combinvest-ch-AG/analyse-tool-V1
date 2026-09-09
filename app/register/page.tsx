import { AuthShell } from "@/components/auth/auth-shell"
import { RegisterForm } from "@/components/auth/register-form"

export const metadata = {
  title: "Berater-Zugang erstellen · Combinvest",
  description: "Selbstregistrierung für Combinvest-Berater mit @combinvest.swiss-Adresse.",
}

export default function RegisterPage() {
  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  )
}

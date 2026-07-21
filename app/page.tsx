import { redirect } from "next/navigation"
import { getCurrentAdvisor } from "@/lib/auth/advisor"

export default async function HomePage() {
  const advisor = await getCurrentAdvisor()
  redirect(advisor ? "/dashboard" : "/login")
}

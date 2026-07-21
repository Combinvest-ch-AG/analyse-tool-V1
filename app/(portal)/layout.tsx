import { redirect } from "next/navigation"
import { getCurrentAdvisor, isManager } from "@/lib/auth/advisor"
import { PortalRail } from "@/components/portal/portal-rail"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const advisor = await getCurrentAdvisor()
  if (!advisor) redirect("/login")

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <PortalRail
        advisorName={advisor.display_name}
        advisorRole={advisor.role}
        advisorTitle={advisor.job_title}
        isManagement={isManager(advisor)}
      />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getCurrentAdvisor, isManager } from "@/lib/auth/advisor"
import { PortalRail } from "@/components/portal/portal-rail"
import { LanguageProvider } from "@/components/i18n/language-provider"
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const advisor = await getCurrentAdvisor()
  if (!advisor) redirect("/login")
  const locale = normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value)

  return (
    <LanguageProvider initialLocale={locale}>
      <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
        <PortalRail
          advisorName={advisor.display_name}
          advisorRole={advisor.role}
          advisorTitle={advisor.job_title}
          isManagement={isManager(advisor)}
        />
        <div className="min-w-0">{children}</div>
      </div>
    </LanguageProvider>
  )
}

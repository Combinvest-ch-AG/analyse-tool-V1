import { getAnalysis, getCustomerById } from "@/lib/data/portal"
import { getCurrentAdvisor } from "@/lib/auth/advisor"
import { buildReportData } from "@/lib/report/report-data"
import { buildAdvisoryReport } from "@/lib/report/advisory-report"
import { cookies } from "next/headers"
import { LOCALE_COOKIE, normalizeLocale, type AppLocale } from "@/lib/i18n"

function filename(name: string, locale: AppLocale): string {
  const clean = name.replace(/[^a-zA-Z0-9äöüÄÖÜéèàç -]/g, "").replace(/\s+/g, "-") || "Kunde"
  const reportName = locale === "en" ? "Financial-Analysis" : "Finanzanalyse"
  return `Combinvest-${reportName}-${clean}-${new Date().toISOString().slice(0, 10)}.pdf`
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Only authenticated advisors may render a client report.
  const advisor = await getCurrentAdvisor()
  if (!advisor) return new Response("Nicht angemeldet.", { status: 401 })

  const analysis = await getAnalysis(id)
  if (!analysis) return new Response("Analyse nicht gefunden.", { status: 404 })

  const locale = normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value)
  const customer = await getCustomerById(analysis.customer_id)
  const data = buildReportData(analysis, customer, advisor)
  const bytes = await buildAdvisoryReport(data, locale)

  const name = customer
    ? [customer.first_name, customer.last_name].filter(Boolean).join(" ")
    : data.customerName

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename(name, locale)}"`,
      "Cache-Control": "no-store",
    },
  })
}

import { createAdminClient } from "@/lib/supabase/admin"
import { buildReportData } from "@/lib/report/report-data"
import { buildAdvisoryReport } from "@/lib/report/advisory-report"

export const REPORT_BUCKET = "analysis-documents"

export type ReportHandoff = {
  title: string
  downloadUrl: string | null
  mimeType: string
  generatedAt: string | null
}

/**
 * Erzeugt das Beratungsprotokoll serverseitig, legt es unter einem
 * deterministischen Pfad im privaten Bucket ab und gibt eine kurzlebige
 * signierte URL zurueck.
 *
 * Der Pfad ist pro Analyse stabil (`upsert`), damit wiederholte Abrufe die
 * Ablage nicht zumuellen. Catalyst laedt die Datei ueber die signierte URL und
 * haengt sie an den Kontakt.
 *
 * Fehler werden bewusst geschluckt und als `null` gemeldet: ein nicht
 * erzeugbares PDF darf den Datenrueckfluss nach Catalyst nie blockieren.
 */
export async function buildReportHandoff(analysisId: string): Promise<ReportHandoff | null> {
  try {
    const admin = createAdminClient()

    const analysis = await admin
      .from("analyses")
      .select("id, customer_id, status, latest_snapshot, started_at, completed_at, advisor_id")
      .eq("id", analysisId)
      .maybeSingle()
    if (analysis.error || !analysis.data) return null

    const customer = await admin
      .from("customers")
      .select("*")
      .eq("id", analysis.data.customer_id)
      .maybeSingle()

    // buildReportData erwartet den Berater nur fuer Kopf-/Fussdaten; bei einem
    // maschinellen Abruf gibt es keine Session, daher das Profil direkt lesen.
    const advisor = analysis.data.advisor_id
      ? await admin
          .from("advisor_profiles")
          .select("*")
          .eq("id", analysis.data.advisor_id)
          .maybeSingle()
      : null

    const data = buildReportData(
      // Die Report-Builder sind auf die gleichen Zeilenformen typisiert, die
      // getAnalysis/getCustomerById liefern.
      analysis.data as never,
      (customer?.data ?? null) as never,
      (advisor?.data ?? null) as never,
    )
    const bytes = await buildAdvisoryReport(data, "de")

    const generatedAt = new Date().toISOString()
    const path = `catalyst/${analysisId}/beratungsprotokoll.pdf`
    const upload = await admin.storage.from(REPORT_BUCKET).upload(path, Buffer.from(bytes), {
      contentType: "application/pdf",
      upsert: true,
    })
    if (upload.error) return null

    const signed = await admin.storage.from(REPORT_BUCKET).createSignedUrl(path, 60 * 60)

    return {
      title: "Beratungsprotokoll Finanzanalyse",
      downloadUrl: signed.data?.signedUrl ?? null,
      mimeType: "application/pdf",
      generatedAt,
    }
  } catch {
    return null
  }
}

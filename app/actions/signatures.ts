"use server"

import { headers } from "next/headers"
import { getCurrentAdvisor } from "@/lib/auth/advisor"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail, emailShell, primaryButton } from "@/lib/email/resend"
import {
  CUSTOMER_SIGN_ANCHORS,
  ADVISOR_SIGN_ANCHORS,
  SIGNATURE_BUCKET,
  type SignAnchor,
} from "@/lib/documents/signature-anchors"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type StoredDoc = { id: string; name: string; path: string; signedPath?: string; finalPath?: string }

type SendInput = {
  analysisId: string
  customerId: string
  customerEmail: string
  customerName: string
  documents: { id: string; name: string; base64: string }[]
}

async function baseUrl(): Promise<string> {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? "https"
  if (host) return `${proto}://${host}`
  return process.env.NEXT_PUBLIC_SITE_URL ?? ""
}

function randomToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes).toString("base64url")
}

function pngFromDataUrl(dataUrl: string): Buffer {
  return Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64")
}

/** Berater sendet die (befüllten, noch unsignierten) PDFs per E-Mail zur Kundenunterschrift. */
export async function createSignatureRequest(
  input: SendInput,
): Promise<{ ok: boolean; url?: string; emailSent?: boolean; error?: string }> {
  const advisor = await getCurrentAdvisor()
  if (!advisor) return { ok: false, error: "Nicht angemeldet." }
  if (!EMAIL_RE.test(input.customerEmail)) return { ok: false, error: "Bitte eine gültige Kunden-E-Mail erfassen." }
  if (!input.documents.length) return { ok: false, error: "Keine Dokumente ausgewählt." }

  const admin = createAdminClient()

  const { data: analysis } = await admin
    .from("analyses")
    .select("id, organization_id")
    .eq("id", input.analysisId)
    .maybeSingle()
  if (!analysis || analysis.organization_id !== advisor.organization_id) {
    return { ok: false, error: "Analyse nicht gefunden." }
  }

  const requestId = crypto.randomUUID()
  const token = randomToken()
  const stored: StoredDoc[] = []

  for (const doc of input.documents) {
    const bytes = Buffer.from(doc.base64, "base64")
    const path = `signatures/${input.analysisId}/${requestId}/${doc.id}.pdf`
    const up = await admin.storage
      .from(SIGNATURE_BUCKET)
      .upload(path, bytes, { contentType: "application/pdf", upsert: true })
    if (up.error) return { ok: false, error: "Dokument konnte nicht gespeichert werden." }
    stored.push({ id: doc.id, name: doc.name, path })
  }

  const { error: insErr } = await admin.from("signature_requests").insert({
    id: requestId,
    organization_id: advisor.organization_id,
    analysis_id: input.analysisId,
    customer_id: input.customerId,
    advisor_id: advisor.id,
    advisor_email: advisor.email,
    token,
    status: "sent",
    customer_name: input.customerName,
    customer_email: input.customerEmail,
    documents: stored,
  })
  if (insErr) return { ok: false, error: "Signatur-Anfrage konnte nicht angelegt werden." }

  const url = `${await baseUrl()}/signieren/${token}`
  const list = stored.map((d) => `<li style="margin:2px 0">${d.name}</li>`).join("")
  const email = await sendEmail({
    to: input.customerEmail,
    replyTo: advisor.email,
    subject: "Ihre Unterlagen zur Unterschrift",
    html: emailShell(
      "Bitte unterschreiben Sie Ihre Unterlagen",
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.6">Guten Tag ${input.customerName || ""},<br/>
       Ihr Berater hat folgende Dokumente für Sie vorbereitet:</p>
       <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;color:#334155">${list}</ul>
       <p style="margin:0 0 20px">${primaryButton(url, "Jetzt digital unterschreiben")}</p>
       <p style="margin:0;font-size:13px;color:#64748b">Der Link ist 14 Tage gültig und nur für Sie bestimmt.</p>`,
    ),
  })

  return { ok: true, url, emailSent: email.ok }
}

/** Öffentliche Signier-Seite: lädt die Anfrage über den Token (Service-Role, kein Login). */
export async function getSignatureRequestByToken(token: string): Promise<{
  status: string
  expired: boolean
  customerName: string | null
  advisorEmail: string | null
  docs: { id: string; name: string; previewUrl: string | null }[]
} | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("signature_requests")
    .select("id, status, customer_name, advisor_email, documents, expires_at")
    .eq("token", token)
    .maybeSingle()
  if (!data) return null

  const expired = new Date(data.expires_at as string).getTime() < Date.now()
  const docs: { id: string; name: string; previewUrl: string | null }[] = []
  for (const d of (data.documents as StoredDoc[]) ?? []) {
    const source = d.signedPath ?? d.path
    const { data: signed } = await admin.storage.from(SIGNATURE_BUCKET).createSignedUrl(source, 60 * 30)
    docs.push({ id: d.id, name: d.name, previewUrl: signed?.signedUrl ?? null })
  }

  if (data.status === "sent" && !expired) {
    await admin
      .from("signature_requests")
      .update({ status: "viewed", updated_at: new Date().toISOString() })
      .eq("id", data.id)
  }

  return {
    status: data.status as string,
    expired,
    customerName: data.customer_name as string | null,
    advisorEmail: data.advisor_email as string | null,
    docs,
  }
}

/** Kunde reicht die Unterschrift ein; sie wird serverseitig in jedes PDF eingebettet. */
export async function submitCustomerSignature(input: {
  token: string
  signaturePng: string
  consent: boolean
}): Promise<{ ok: boolean; error?: string }> {
  if (!input.consent) return { ok: false, error: "Bitte bestätigen Sie die Einwilligung." }
  if (!input.signaturePng.startsWith("data:image/png")) return { ok: false, error: "Unterschrift fehlt." }

  const admin = createAdminClient()
  const { data: req } = await admin
    .from("signature_requests")
    .select("id, status, documents, expires_at, advisor_email, customer_name, analysis_id")
    .eq("token", input.token)
    .maybeSingle()
  if (!req) return { ok: false, error: "Ungültiger Link." }
  if (["signed_by_customer", "completed"].includes(req.status as string)) {
    return { ok: false, error: "Diese Dokumente wurden bereits unterschrieben." }
  }
  if (new Date(req.expires_at as string).getTime() < Date.now()) {
    return { ok: false, error: "Der Link ist abgelaufen. Bitte fordern Sie einen neuen an." }
  }

  const pngBytes = pngFromDataUrl(input.signaturePng)
  const { PDFDocument } = await import("pdf-lib")
  const docs = (req.documents as StoredDoc[]) ?? []

  for (const d of docs) {
    const anchor: SignAnchor | undefined = CUSTOMER_SIGN_ANCHORS[d.id]
    const dl = await admin.storage.from(SIGNATURE_BUCKET).download(d.path)
    if (dl.error || !dl.data) return { ok: false, error: "Ein Dokument konnte nicht geladen werden." }
    const pdf = await PDFDocument.load(await dl.data.arrayBuffer())
    if (anchor) {
      const png = await pdf.embedPng(pngBytes)
      const pages = pdf.getPages()
      const page = anchor.page === "last" ? pages[pages.length - 1] : pages[0]
      page.drawImage(png, { x: anchor.x, y: anchor.y, width: anchor.w, height: anchor.h })
    }
    const out = await pdf.save()
    const signedPath = d.path.replace(/\.pdf$/, "-signed.pdf")
    const up = await admin.storage
      .from(SIGNATURE_BUCKET)
      .upload(signedPath, Buffer.from(out), { contentType: "application/pdf", upsert: true })
    if (up.error) return { ok: false, error: "Unterschriebenes Dokument konnte nicht gespeichert werden." }
    d.signedPath = signedPath
  }

  const h = await headers()
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
  const ua = h.get("user-agent") ?? null

  await admin
    .from("signature_requests")
    .update({
      status: "signed_by_customer",
      consent: true,
      signed_at: new Date().toISOString(),
      signer_ip: ip,
      signer_user_agent: ua,
      documents: docs,
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.id)

  if (req.advisor_email) {
    const url = `${await baseUrl()}/analyse/${req.analysis_id}/dokumente`
    await sendEmail({
      to: req.advisor_email as string,
      subject: `Kundenunterschrift erhalten – ${req.customer_name ?? "Kunde"}`,
      html: emailShell(
        "Die Kundenunterschrift ist eingegangen",
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6">${req.customer_name ?? "Ihr Kunde"} hat die Unterlagen digital unterschrieben.
         Sie können die Beraterunterschrift jetzt im Tool ergänzen.</p>
         <p style="margin:0">${primaryButton(url, "Dokumente öffnen")}</p>`,
      ),
    })
  }

  return { ok: true }
}

/** Berater-Ansicht: Signatur-Anfragen einer Analyse mit Download-Links der aktuellen Fassung. */
export async function listSignatureRequests(analysisId: string): Promise<
  {
    id: string
    status: string
    customerName: string | null
    customerEmail: string
    signedAt: string | null
    createdAt: string
    docs: { id: string; name: string; downloadUrl: string | null }[]
  }[]
> {
  const advisor = await getCurrentAdvisor()
  if (!advisor) return []
  const admin = createAdminClient()

  const { data } = await admin
    .from("signature_requests")
    .select("id, status, customer_name, customer_email, signed_at, created_at, documents, organization_id, analysis_id")
    .eq("analysis_id", analysisId)
    .order("created_at", { ascending: false })
  if (!data) return []

  const rows = data.filter((r) => r.organization_id === advisor.organization_id)
  const out = []
  for (const r of rows) {
    const docs: { id: string; name: string; downloadUrl: string | null }[] = []
    for (const d of (r.documents as StoredDoc[]) ?? []) {
      const source = d.finalPath ?? d.signedPath ?? d.path
      const { data: signed } = await admin.storage.from(SIGNATURE_BUCKET).createSignedUrl(source, 60 * 30)
      docs.push({ id: d.id, name: d.name, downloadUrl: signed?.signedUrl ?? null })
    }
    out.push({
      id: r.id as string,
      status: r.status as string,
      customerName: r.customer_name as string | null,
      customerEmail: r.customer_email as string,
      signedAt: r.signed_at as string | null,
      createdAt: r.created_at as string,
      docs,
    })
  }
  return out
}

/** Berater ergänzt seine Unterschrift auf den bereits kundenseitig signierten PDFs. */
export async function advisorCompleteSignature(input: {
  requestId: string
  signaturePng: string
}): Promise<{ ok: boolean; error?: string }> {
  const advisor = await getCurrentAdvisor()
  if (!advisor) return { ok: false, error: "Nicht angemeldet." }
  if (!input.signaturePng.startsWith("data:image/png")) return { ok: false, error: "Unterschrift fehlt." }

  const admin = createAdminClient()
  const { data: req } = await admin
    .from("signature_requests")
    .select("id, status, documents, organization_id")
    .eq("id", input.requestId)
    .maybeSingle()
  if (!req || req.organization_id !== advisor.organization_id) return { ok: false, error: "Anfrage nicht gefunden." }
  if (req.status !== "signed_by_customer") {
    return { ok: false, error: "Es liegt noch keine Kundenunterschrift vor." }
  }

  const pngBytes = pngFromDataUrl(input.signaturePng)
  const { PDFDocument } = await import("pdf-lib")
  const docs = (req.documents as StoredDoc[]) ?? []

  for (const d of docs) {
    const source = d.signedPath ?? d.path
    const dl = await admin.storage.from(SIGNATURE_BUCKET).download(source)
    if (dl.error || !dl.data) return { ok: false, error: "Ein Dokument konnte nicht geladen werden." }
    const pdf = await PDFDocument.load(await dl.data.arrayBuffer())
    const anchor = ADVISOR_SIGN_ANCHORS[d.id]
    if (anchor) {
      const png = await pdf.embedPng(pngBytes)
      const pages = pdf.getPages()
      const page = anchor.page === "last" ? pages[pages.length - 1] : pages[0]
      page.drawImage(png, { x: anchor.x, y: anchor.y, width: anchor.w, height: anchor.h })
    }
    const out = await pdf.save()
    const finalPath = d.path.replace(/\.pdf$/, "-final.pdf")
    const up = await admin.storage
      .from(SIGNATURE_BUCKET)
      .upload(finalPath, Buffer.from(out), { contentType: "application/pdf", upsert: true })
    if (up.error) return { ok: false, error: "Finales Dokument konnte nicht gespeichert werden." }
    d.finalPath = finalPath
  }

  await admin
    .from("signature_requests")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      documents: docs,
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.id)

  return { ok: true }
}

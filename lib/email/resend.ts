import "server-only"

/**
 * Minimaler Resend-Versand über die REST-API (kein SDK nötig).
 * RESEND_API_KEY ist als Projekt-Env vorhanden. Der Absender lässt sich über
 * SIGN_EMAIL_FROM auf eine in Resend verifizierte Domain setzen; ohne diese
 * Variable wird die Resend-Testadresse verwendet (liefert nur an den
 * Kontoinhaber – der Berater erhält den Link zusätzlich immer in der Oberfläche).
 */
const FROM = process.env.SIGN_EMAIL_FROM || "Combinvest <onboarding@resend.dev>"

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
  replyTo?: string
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: "RESEND_API_KEY fehlt" }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return { ok: false, error: `HTTP ${res.status} ${text}`.slice(0, 300) }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/** Schlichtes, markenkonformes HTML-Gerüst für Transaktionsmails. */
export function emailShell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
      <tr><td style="background:#1d4ed8;padding:20px 28px"><span style="color:#ffffff;font-size:16px;font-weight:800;letter-spacing:.3px">Combinvest</span></td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 12px;font-size:20px;font-weight:800">${title}</h1>
        ${bodyHtml}
      </td></tr>
      <tr><td style="padding:16px 28px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.5">
        Diese E-Mail wurde automatisch im Rahmen Ihrer Beratung versendet. Bei Fragen antworten Sie einfach auf diese Nachricht.
      </td></tr>
    </table>
  </td></tr></table></body></html>`
}

export function primaryButton(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 24px;border-radius:10px">${label}</a>`
}

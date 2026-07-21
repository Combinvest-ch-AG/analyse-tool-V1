"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Gift, Percent, Ticket } from "lucide-react"
import { saveReferral } from "@/app/actions/portal"

type Consent = "" | "yes" | "link"
type Reward = "sealth" | "service" | "voucher"

export type ReferralData = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  consent?: Consent
  reward?: Reward
  updatedAt?: string
}

const INPUT_CLASS =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"

const CONSENT_LABEL: Record<Exclude<Consent, "">, string> = {
  yes: "Kontakt erlaubt",
  link: "Nur Link teilen",
}

const REWARDS: { value: Reward; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "sealth", label: "Sealth-Gutschrift", hint: "Auf ein Service-Paket vormerken.", icon: Gift },
  { value: "service", label: "Service-Rabatt", hint: "Auf eine Dienstleistung vormerken.", icon: Percent },
  { value: "voucher", label: "Partner-Gutschein", hint: "Nach Verfügbarkeit auswählen.", icon: Ticket },
]

export function ReferralForm({
  analysisId,
  customerName,
  initial,
}: {
  analysisId: string
  customerName: string
  initial: ReferralData
}) {
  const [firstName, setFirstName] = useState(initial.firstName ?? "")
  const [lastName, setLastName] = useState(initial.lastName ?? "")
  const [email, setEmail] = useState(initial.email ?? "")
  const [phone, setPhone] = useState(initial.phone ?? "")
  const [consent, setConsent] = useState<Consent>(initial.consent ?? "")
  const [reward, setReward] = useState<Reward>(initial.reward ?? "sealth")
  const [saved, setSaved] = useState(Boolean(initial.updatedAt))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    if (!firstName.trim() || !lastName.trim()) {
      setError("Vor- und Nachname sind erforderlich.")
      return
    }
    if (!consent) {
      setError("Bitte das Einverständnis bestätigen.")
      return
    }
    setBusy(true)
    const res = await saveReferral({
      analysisId,
      payload: { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim(), consent, reward },
    })
    setBusy(false)
    if (res.ok) {
      setSaved(true)
    } else {
      setError(res.error)
    }
  }

  async function handleReset() {
    setBusy(true)
    await saveReferral({ analysisId, payload: {} })
    setBusy(false)
    setFirstName("")
    setLastName("")
    setEmail("")
    setPhone("")
    setConsent("")
    setReward("sealth")
    setSaved(false)
    setError(null)
  }

  const dash = "—"
  const summaryRows: { label: string; value: string }[] = [
    { label: "Vorname", value: firstName || dash },
    { label: "Nachname", value: lastName || dash },
    { label: "E-Mail", value: email || dash },
    { label: "Telefon", value: phone || dash },
    { label: "Kontakt", value: consent ? CONSENT_LABEL[consent] : dash },
    { label: "Vorteil", value: REWARDS.find((r) => r.value === reward)?.label ?? dash },
  ]

  return (
    <div>
      {/* Back link */}
      <Link
        href={`/analyse/${analysisId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zum Analyseabschluss
      </Link>

      {/* Hero */}
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Abschluss · Dankeschön</p>
        <h1 className="mt-2 text-balance text-2xl font-extrabold text-foreground sm:text-3xl">
          Weiterempfehlen und Vorteil sichern
        </h1>
        <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
          Ein eigenständiger Abschlussprozess nach der Beratung von {customerName} – getrennt von Vorsorge- und
          Vermögenstools. Es werden noch keine Kontaktdaten versendet und keine Gutscheine ausgegeben.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Form card */}
        <section className="rounded-2xl border border-border bg-card p-6">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-colors ${i === 0 ? "w-8 bg-primary" : "w-4 bg-muted"}`}
                aria-hidden="true"
              />
            ))}
          </div>
          <h2 className="mt-4 text-lg font-extrabold text-foreground">Empfehlung vormerken</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Halten Sie die empfohlene Person fest. Der Anspruch wird erst nach erfolgreichem Abschluss aktiv.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Vorname der empfohlenen Person" required>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={INPUT_CLASS}
                autoComplete="off"
              />
            </Field>
            <Field label="Nachname" required>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={INPUT_CLASS} autoComplete="off" />
            </Field>
            <Field label="E-Mail">
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={INPUT_CLASS} autoComplete="off" />
            </Field>
            <Field label="Telefon">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                placeholder="+41 …"
                className={INPUT_CLASS}
                autoComplete="off"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Einverständnis" required>
                <select value={consent} onChange={(e) => setConsent(e.target.value as Consent)} className={INPUT_CLASS}>
                  <option value="">Bitte bestätigen</option>
                  <option value="yes">Kontakt durch combinvest erlaubt</option>
                  <option value="link">Zuerst nur Empfehlungslink teilen</option>
                </select>
              </Field>
            </div>
          </div>

          {/* Reward */}
          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Vorteil nach erfolgreichem Abschluss
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {REWARDS.map((r) => {
                const Icon = r.icon
                const active = reward === r.value
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReward(r.value)}
                    aria-pressed={active}
                    className={`flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                    <b className="text-sm font-bold text-foreground">{r.label}</b>
                    <small className="text-[11.5px] leading-snug text-muted-foreground">{r.hint}</small>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notice */}
          <p className="mt-5 rounded-xl bg-muted px-4 py-3 text-[11.5px] leading-relaxed text-muted-foreground">
            Anspruch und Höhe werden nach den später hinterlegten Teilnahmebedingungen bestimmt. Diese Vormerkung dient
            der Dokumentation im Beratungsabschluss.
          </p>

          {error ? <p className="mt-3 text-sm font-medium text-destructive">{error}</p> : null}

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-extrabold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-50"
            >
              {busy ? "Wird gespeichert …" : "Empfehlung vormerken"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-[13px] font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              Zurücksetzen
            </button>
            {saved ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-success">
                <Check className="h-4 w-4" aria-hidden="true" />
                Empfehlung vorgemerkt
              </span>
            ) : (
              <span className="text-[13px] font-medium text-muted-foreground">Noch keine Empfehlung</span>
            )}
          </div>
        </section>

        {/* Live summary */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Zusammenfassung</p>
            <dl className="mt-3 flex flex-col">
              {summaryRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-b-0"
                >
                  <dt className="text-[13px] text-muted-foreground">{row.label}</dt>
                  <dd className="text-right text-[13px] font-semibold text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
    </label>
  )
}

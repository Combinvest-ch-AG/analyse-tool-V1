import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Mail, Phone, MapPin, Cake, FileText, LineChart, ArrowRight } from "lucide-react"
import { getCustomerDetail, type AnalysisStatus, type CustomerRow } from "@/lib/data/portal"
import { StartAnalysisButton } from "@/components/portal/start-analysis-button"
import { EditCustomerDialog } from "@/components/portal/edit-customer-dialog"
import { initials, fullName, formatDate, formatCHF } from "@/lib/format"

const STATUS_LABEL: Record<AnalysisStatus, string> = {
  draft: "Entwurf",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
  cancelled: "Abgebrochen",
}

const GENDER_LABEL: Record<string, string> = { male: "Männlich", female: "Weiblich", other: "Divers" }
const LANGUAGE_LABEL: Record<string, string> = { de: "Deutsch", fr: "Französisch", it: "Italienisch", en: "Englisch" }
const CUSTOMER_STATUS_LABEL: Record<string, string> = {
  lead: "Lead",
  active: "Aktiv",
  inactive: "Inaktiv",
  archived: "Archiviert",
}
const CUSTOMER_TYPE_LABEL: Record<string, string> = { private: "Privatperson", company: "Firma" }

function displayName(c: CustomerRow): string {
  if (c.customer_type === "company") return c.company_name || fullName(c.first_name, c.last_name)
  return fullName(c.first_name, c.last_name)
}

function displayAddress(c: CustomerRow): string {
  const line1 = [c.street, c.house_number].filter(Boolean).join(" ")
  const line2 = [c.postcode, c.city].filter(Boolean).join(" ")
  return [line1, line2, c.country_code].filter(Boolean).join(", ")
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getCustomerDetail(id)
  if (!detail) notFound()

  const { customer, analyses, contracts } = detail
  const activeAnalysis = analyses.find((a) => a.status === "draft" || a.status === "in_progress")

  const contact = [
    customer.email && { icon: Mail, text: customer.email },
    customer.phone && { icon: Phone, text: customer.phone },
    (customer.postcode || customer.city) && {
      icon: MapPin,
      text: [customer.postcode, customer.city].filter(Boolean).join(" "),
    },
    customer.birthdate && { icon: Cake, text: formatDate(customer.birthdate) },
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; text: string }[]

  return (
    <main className="px-5 py-8 sm:px-8 lg:px-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Übersicht
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
            {initials(customer.first_name, customer.last_name)}
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {displayName(customer)}
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {contact.map((c, i) => {
                const Icon = c.icon
                return (
                  <span key={i} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {c.text}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
        {activeAnalysis ? (
          <Link
            href={`/analyse/${activeAnalysis.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[#245bd2]"
          >
            <LineChart className="h-4 w-4" />
            Analyse fortsetzen
          </Link>
        ) : (
          <StartAnalysisButton customerId={customer.id} />
        )}
      </div>

      {/* Customer data */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Kundendaten</h2>
          <EditCustomerDialog customer={customer} />
        </div>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
          <DataRow label="Kundentyp" value={CUSTOMER_TYPE_LABEL[customer.customer_type] ?? customer.customer_type} />
          <DataRow label="Status" value={CUSTOMER_STATUS_LABEL[customer.status ?? ""] ?? customer.status} />
          {customer.customer_type === "company" && <DataRow label="Firmenname" value={customer.company_name} />}
          <DataRow label="Anrede" value={customer.salutation} />
          <DataRow label="Vorname" value={customer.first_name} />
          <DataRow label="Nachname" value={customer.last_name} />
          <DataRow label="Geburtsdatum" value={customer.birthdate ? formatDate(customer.birthdate) : null} />
          <DataRow label="Geschlecht" value={customer.gender ? (GENDER_LABEL[customer.gender] ?? customer.gender) : null} />
          <DataRow label="E-Mail" value={customer.email} />
          <DataRow label="Telefon" value={customer.phone} />
          <DataRow label="Adresse" value={displayAddress(customer) || null} />
          <DataRow
            label="Sprache"
            value={customer.preferred_language ? (LANGUAGE_LABEL[customer.preferred_language] ?? customer.preferred_language) : null}
          />
          <DataRow
            label="Monatseinkommen"
            value={customer.monthly_income != null ? formatCHF(customer.monthly_income) : null}
          />
        </dl>
      </section>

      {/* Analyses history */}
      <section className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Analysen</h2>
          {activeAnalysis && <StartAnalysisButton customerId={customer.id} variant="secondary" label="Weitere starten" />}
        </div>
        <div className="flex flex-col gap-2">
          {analyses.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-5 py-8 text-center text-sm text-muted-foreground">
              Noch keine Analyse für diesen Kunden.
            </div>
          )}
          {analyses.map((a) => {
            const done = a.status === "completed"
            return (
              <Link
                key={a.id}
                href={`/analyse/${a.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-3.5 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <LineChart className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {a.title || "Finanzanalyse"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Schritt {a.current_step ?? 1} · {Number(a.progress_percent ?? 0).toFixed(0)} % ·
                    zuletzt {formatDate(a.updated_at)}
                  </p>
                </div>
                <span
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    done ? "bg-[#e7f8f0] text-[#08784a]" : "bg-[#fff5df] text-[#9c6105]"
                  }`}
                >
                  {STATUS_LABEL[a.status]}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            )
          })}
        </div>
      </section>

      {/* Contracts */}
      <section className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Bestehende Verträge</h2>
        <div className="flex flex-col gap-2">
          {contracts.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-5 py-8 text-center text-sm text-muted-foreground">
              Keine Verträge erfasst.
            </div>
          )}
          {contracts.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {c.contract_type || "Vertrag"}
                  {c.provider_name ? ` · ${c.provider_name}` : ""}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.policy_number ? `Police ${c.policy_number} · ` : ""}
                  {c.expiry_date ? `Ablauf ${formatDate(c.expiry_date)}` : "Kein Ablaufdatum"}
                </p>
              </div>
              {c.gross_premium != null && (
                <span className="whitespace-nowrap text-sm font-semibold text-foreground">
                  {formatCHF(c.gross_premium)}
                  <span className="text-xs font-normal text-muted-foreground">
                    /{c.premium_interval || "Jahr"}
                  </span>
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

function DataRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">{value || "–"}</dd>
    </div>
  )
}

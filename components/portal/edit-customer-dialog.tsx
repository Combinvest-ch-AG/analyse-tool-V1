"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil, X } from "lucide-react"
import { updateCustomer } from "@/app/actions/portal"
import type { CustomerRow } from "@/lib/data/portal"

const LANGUAGES = [
  ["de", "Deutsch"],
  ["fr", "Französisch"],
  ["it", "Italienisch"],
  ["en", "Englisch"],
] as const

const GENDERS = [
  ["male", "Männlich"],
  ["female", "Weiblich"],
  ["other", "Divers"],
] as const

const STATUSES = [
  ["lead", "Lead"],
  ["active", "Aktiv"],
  ["inactive", "Inaktiv"],
  ["archived", "Archiviert"],
] as const

const SALUTATIONS = ["Herr", "Frau"] as const

export function EditCustomerDialog({ customer }: { customer: CustomerRow }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customerType, setCustomerType] = useState<"private" | "company">(
    customer.customer_type === "company" ? "company" : "private",
  )
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function onSubmit(formData: FormData) {
    setError(null)
    const payload = {
      customer_type: String(formData.get("customer_type") ?? "private"),
      salutation: String(formData.get("salutation") ?? ""),
      first_name: String(formData.get("first_name") ?? ""),
      last_name: String(formData.get("last_name") ?? ""),
      company_name: String(formData.get("company_name") ?? ""),
      birthdate: String(formData.get("birthdate") ?? ""),
      gender: String(formData.get("gender") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      street: String(formData.get("street") ?? ""),
      house_number: String(formData.get("house_number") ?? ""),
      postcode: String(formData.get("postcode") ?? ""),
      city: String(formData.get("city") ?? ""),
      country_code: String(formData.get("country_code") ?? ""),
      monthly_income: String(formData.get("monthly_income") ?? ""),
      preferred_language: String(formData.get("preferred_language") ?? ""),
      status: String(formData.get("status") ?? "lead"),
    }
    startTransition(async () => {
      const result = await updateCustomer(customer.id, payload)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
      >
        <Pencil className="h-4 w-4" />
        Bearbeiten
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#061125]/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-6">
              <h2 className="text-lg font-semibold text-foreground">Kundendaten bearbeiten</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={onSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2">
                <Select
                  name="customer_type"
                  label="Kundentyp"
                  defaultValue={customerType}
                  onChange={(v) => setCustomerType(v as "private" | "company")}
                  options={[
                    ["private", "Privatperson"],
                    ["company", "Firma"],
                  ]}
                />
                <Select name="salutation" label="Anrede" defaultValue={customer.salutation ?? ""} allowEmpty
                  options={SALUTATIONS.map((s) => [s, s])} />

                {customerType === "company" ? (
                  <Field name="company_name" label="Firmenname" defaultValue={customer.company_name ?? ""} className="sm:col-span-2" />
                ) : null}

                <Field name="first_name" label="Vorname" defaultValue={customer.first_name ?? ""} />
                <Field name="last_name" label="Nachname" defaultValue={customer.last_name ?? ""} />

                <Field name="birthdate" label="Geburtsdatum" type="date" defaultValue={customer.birthdate ?? ""} />
                <Select name="gender" label="Geschlecht" defaultValue={customer.gender ?? ""} allowEmpty
                  options={GENDERS.map((g) => [g[0], g[1]])} />

                <Field name="email" label="E-Mail" type="email" defaultValue={customer.email ?? ""} />
                <Field name="phone" label="Telefon" type="tel" defaultValue={customer.phone ?? ""} />

                <Field name="street" label="Strasse" defaultValue={customer.street ?? ""} />
                <Field name="house_number" label="Nr." defaultValue={customer.house_number ?? ""} />
                <Field name="postcode" label="PLZ" defaultValue={customer.postcode ?? ""} />
                <Field name="city" label="Ort" defaultValue={customer.city ?? ""} />
                <Field name="country_code" label="Land (2 Buchstaben)" defaultValue={customer.country_code ?? ""} maxLength={2} />
                <Field
                  name="monthly_income"
                  label="Monatseinkommen (CHF)"
                  type="number"
                  min="0"
                  step="100"
                  defaultValue={customer.monthly_income != null ? String(customer.monthly_income) : ""}
                />

                <Select name="preferred_language" label="Sprache" defaultValue={customer.preferred_language ?? ""} allowEmpty
                  options={LANGUAGES.map((l) => [l[0], l[1]])} />
                <Select name="status" label="Status" defaultValue={customer.status ?? "lead"}
                  options={STATUSES.map((s) => [s[0], s[1]])} />

                {error && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">{error}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-border p-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[#245bd2] disabled:opacity-60"
                >
                  {pending ? "Wird gespeichert …" : "Änderungen speichern"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  className = "",
  ...rest
}: {
  name: string
  label: string
  type?: string
  defaultValue?: string
  className?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={name} className="text-xs font-semibold text-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-primary/10"
        {...rest}
      />
    </div>
  )
}

function Select({
  name,
  label,
  defaultValue,
  options,
  allowEmpty = false,
  onChange,
  className = "",
}: {
  name: string
  label: string
  defaultValue?: string
  options: readonly (readonly [string, string])[]
  allowEmpty?: boolean
  onChange?: (value: string) => void
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={name} className="text-xs font-semibold text-foreground">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-primary/10"
      >
        {allowEmpty && <option value="">–</option>}
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </div>
  )
}

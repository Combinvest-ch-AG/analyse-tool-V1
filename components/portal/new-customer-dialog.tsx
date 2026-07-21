"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { createCustomerAndAnalysis } from "@/app/actions/portal"

export function NewCustomerDialog({
  variant = "primary",
  label = "Neue Analyse",
}: {
  variant?: "primary" | "secondary"
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createCustomerAndAnalysis({
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        birthdate: String(formData.get("birthdate") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        postcode: String(formData.get("postcode") ?? ""),
        city: String(formData.get("city") ?? ""),
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setOpen(false)
      router.push(`/analyse/${result.analysisId}`)
    })
  }

  const btnClass =
    variant === "primary"
      ? "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[#245bd2]"
      : "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnClass}>
        <Plus className="h-4 w-4" />
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#061125]/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Neuen Kunden erfassen</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                aria-label="Schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field name="firstName" label="Vorname" required />
              <Field name="lastName" label="Nachname" required />
              <Field name="birthdate" label="Geburtsdatum" type="date" />
              <Field name="phone" label="Telefon" />
              <Field name="email" label="E-Mail" type="email" className="sm:col-span-2" />
              <Field name="postcode" label="PLZ" />
              <Field name="city" label="Ort" />

              {error && (
                <p className="sm:col-span-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="mt-1 flex justify-end gap-2 sm:col-span-2">
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
                  {pending ? "Wird gespeichert …" : "Speichern & Analyse starten"}
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
  required,
  className = "",
}: {
  name: string
  label: string
  type?: string
  required?: boolean
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={name} className="text-xs font-semibold text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-primary/10"
      />
    </div>
  )
}

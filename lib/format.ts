export function initials(firstName?: string | null, lastName?: string | null): string {
  const a = (firstName ?? "").trim()[0] ?? ""
  const b = (lastName ?? "").trim()[0] ?? ""
  return (a + b).toUpperCase() || "?"
}

export function fullName(firstName?: string | null, lastName?: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || "Unbekannt"
}

const dateFmt = new Intl.DateTimeFormat("de-CH", { dateStyle: "medium" })
const dateTimeFmt = new Intl.DateTimeFormat("de-CH", { dateStyle: "medium", timeStyle: "short" })

export function formatDate(value?: string | null): string {
  if (!value) return "–"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "–" : dateFmt.format(d)
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "–"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "–" : dateTimeFmt.format(d)
}

const chf = new Intl.NumberFormat("de-CH", {
  style: "currency",
  currency: "CHF",
  maximumFractionDigits: 0,
})

const chf2 = new Intl.NumberFormat("de-CH", {
  style: "currency",
  currency: "CHF",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCHF(value?: number | null, decimals: 0 | 2 = 0): string {
  if (value == null || Number.isNaN(value)) return "–"
  return (decimals === 2 ? chf2 : chf).format(value)
}

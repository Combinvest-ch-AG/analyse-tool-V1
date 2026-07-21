"use client"

import { useMemo, useState } from "react"
import { Pencil, Plus, X } from "lucide-react"
import { COMPANIES, INTERVALS, PRODUCTS, type Contract, type Contracts } from "@/lib/wizard/schema"

const chf = (n: number) =>
  "CHF " + Number(n || 0).toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function ContractCheck({
  contracts,
  onChange,
}: {
  contracts: Contracts
  onChange: (next: Contracts) => void
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const keys = Object.keys(contracts)

  function save(product: string, next: Contract, originalProduct: string | null) {
    const copy: Contracts = { ...contracts }
    if (originalProduct && originalProduct !== product) delete copy[originalProduct]
    copy[product] = next
    onChange(copy)
    setEditing(null)
  }
  function remove(product: string) {
    const copy = { ...contracts }
    delete copy[product]
    onChange(copy)
    setEditing(null)
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {PRODUCTS.map((p) => {
          const pressed = !!contracts[p]
          return (
            <button
              key={p}
              type="button"
              aria-pressed={pressed}
              onClick={() => setEditing(p)}
              className={`flex min-h-16 items-center justify-center rounded-xl border px-2.5 py-3.5 text-center text-xs font-bold transition-colors ${
                pressed
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(58,87,245,0.3)]"
                  : "border-border bg-card text-foreground hover:border-primary"
              }`}
            >
              {p}
            </button>
          )
        })}
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        {keys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/50 px-4 py-4 text-sm text-muted-foreground">
            Noch keine Produkte gewählt — tippen Sie oben auf ein Produkt, um einen bestehenden Vertrag zu erfassen.
          </div>
        ) : (
          keys.map((p) => {
            const c = contracts[p]
            return (
              <div
                key={p}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-secondary px-4 py-3.5"
              >
                <span className="text-sm font-extrabold text-primary">{p}</span>
                <span className="text-[13px] font-semibold text-foreground">{c.company || "Gesellschaft offen"}</span>
                <span className="text-sm">
                  <b className="font-bold text-foreground">{chf(c.premium ?? 0)}</b>
                  <span className="text-xs text-muted-foreground"> · {INTERVALS[c.interval || "monthly"]}</span>
                </span>
                <span className="text-xs text-muted-foreground">{c.abl ? "Ablauf " + c.abl : "Ohne Ablauf"}</span>
                <span className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`${p} bearbeiten`}
                    onClick={() => setEditing(p)}
                    className="rounded-md p-1.5 text-primary hover:bg-primary/10"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${p} entfernen`}
                    onClick={() => remove(p)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              </div>
            )
          })
        )}
      </div>

      {editing && (
        <ContractModal
          product={editing}
          current={contracts[editing] ?? {}}
          existing={!!contracts[editing]}
          onClose={() => setEditing(null)}
          onSave={(product, next) => save(product, next, editing)}
          onRemove={() => remove(editing)}
        />
      )}
    </div>
  )
}

function ContractModal({
  product,
  current,
  existing,
  onClose,
  onSave,
  onRemove,
}: {
  product: string
  current: Contract
  existing: boolean
  onClose: () => void
  onSave: (product: string, next: Contract) => void
  onRemove: () => void
}) {
  const [productValue, setProductValue] = useState(product)
  const [company, setCompany] = useState(current.company ?? "")
  const [companyOpen, setCompanyOpen] = useState(false)
  const [pol, setPol] = useState(current.pol ?? "")
  const [start, setStart] = useState(current.start ?? "")
  const [abl, setAbl] = useState(current.abl ?? "")
  const [premium, setPremium] = useState(current.premium == null ? "" : String(current.premium))
  const [interval, setInterval] = useState(current.interval ?? "monthly")
  const [notes, setNotes] = useState(current.notes ?? "")

  const matches = useMemo(() => {
    const needle = company.trim().toLocaleLowerCase("de-CH")
    return COMPANIES.filter((n) => !needle || n.toLocaleLowerCase("de-CH").includes(needle)).slice(0, 12)
  }, [company])

  function submit() {
    if (!company.trim()) return
    const num = Number(premium)
    if (!Number.isFinite(num) || num < 0) return
    onSave(productValue, {
      company: company.trim(),
      pol: pol.trim(),
      start,
      abl,
      premium: num,
      interval,
      notes: notes.trim(),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(15,27,54,0.45)] p-5 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="max-h-[calc(100vh-44px)] w-full max-w-2xl overflow-auto rounded-3xl bg-card p-7 shadow-[0_28px_80px_rgba(15,27,54,0.25)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {existing ? "Vertrag bearbeiten" : "Vertrag erfassen"}
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">Bestehenden Vertrag des Kunden dokumentieren.</p>
          </div>
          <button
            type="button"
            aria-label="Schließen"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Produkt">
            <select value={productValue} onChange={(e) => setProductValue(e.target.value)} className={inputClass}>
              {PRODUCTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Gesellschaft">
            <div className="relative">
              <input
                value={company}
                onChange={(e) => {
                  setCompany(e.target.value)
                  setCompanyOpen(true)
                }}
                onFocus={() => setCompanyOpen(true)}
                placeholder="z. B. Swiss Life"
                className={inputClass}
              />
              {companyOpen && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1.5 max-h-48 overflow-auto rounded-xl border border-border bg-card shadow-[0_12px_28px_rgba(15,27,54,0.13)]">
                  {matches.length > 0 ? (
                    matches.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setCompany(name)
                          setCompanyOpen(false)
                        }}
                        className="block w-full px-3 py-2.5 text-left text-[13px] hover:bg-accent hover:text-accent-foreground"
                      >
                        {name}
                      </button>
                    ))
                  ) : (
                    <span className="block px-3 py-2.5 text-[13px] text-muted-foreground">
                      Keine Treffer – Gesellschaft direkt eintippen
                    </span>
                  )}
                </div>
              )}
            </div>
          </Field>

          <Field label="Policennummer">
            <input value={pol} onChange={(e) => setPol(e.target.value)} placeholder="Pol-Nr." className={inputClass} />
          </Field>
          <Field label="Prämie (CHF)">
            <input
              type="number"
              inputMode="decimal"
              value={premium}
              onChange={(e) => setPremium(e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </Field>
          <Field label="Zahlungsintervall">
            <select value={interval} onChange={(e) => setInterval(e.target.value)} className={inputClass}>
              {Object.entries(INTERVALS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Beginn">
            <input type="month" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Ablauf (MM.JJJJ)">
            <input value={abl} onChange={(e) => setAbl(e.target.value)} placeholder="z. B. 12.2030" className={inputClass} />
          </Field>
          <Field label="Notizen" full>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass} min-h-[88px] resize-y`}
            />
          </Field>
        </div>

        <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row">
          {existing ? (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/5"
            >
              Vertrag entfernen
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={submit}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-deep"
            >
              <Plus className="h-4 w-4" />
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputClass =
  "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-xs font-bold tracking-wide text-foreground">{label}</span>
      {children}
    </label>
  )
}

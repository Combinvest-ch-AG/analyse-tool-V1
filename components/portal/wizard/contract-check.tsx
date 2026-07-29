"use client"

import { useMemo, useState } from "react"
import { Pencil, Plus, Search, X } from "lucide-react"
import {
  COMPANIES,
  INTERVALS,
  PRODUCT_CATEGORIES,
  PRODUCT_DEFINITIONS,
  PROVIDERS_BY_PRODUCT,
  type Contract,
  type Contracts,
  type ProductCategory,
} from "@/lib/wizard/schema"

const chf = (n: number) =>
  "CHF " + Number(n || 0).toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const intervalFactor: Record<string, number> = {
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
  oneoff: 0,
}

const definitionById = new Map(PRODUCT_DEFINITIONS.map((product) => [product.id, product]))

function contractProduct(key: string, contract: Contract): string {
  return contract.product || key.split("::")[0]
}

function annualCost(contract: Contract): number {
  return Number(contract.premium || 0) * (intervalFactor[contract.interval || "monthly"] ?? 12)
}

function newContractKey(product: string, contracts: Contracts): string {
  if (!contracts[product]) return product
  return `${product}::${Date.now().toString(36)}`
}

type CategoryFilter = "all" | ProductCategory
type EditState = { key: string; product: string; existing: boolean }

export function ContractCheck({
  contracts,
  onChange,
}: {
  contracts: Contracts
  onChange: (next: Contracts) => void
}) {
  const [editing, setEditing] = useState<EditState | null>(null)
  const [category, setCategory] = useState<CategoryFilter>("insurance")
  const [search, setSearch] = useState("")

  const entries = useMemo(
    () =>
      Object.entries(contracts)
        .map(([key, contract]) => ({ key, contract, product: contractProduct(key, contract) }))
        .sort((a, b) => {
          const aLabel = definitionById.get(a.product)?.label ?? a.product
          const bLabel = definitionById.get(b.product)?.label ?? b.product
          return aLabel.localeCompare(bLabel, "de-CH")
        }),
    [contracts],
  )

  const counts = useMemo(() => {
    const next: Record<string, number> = {}
    entries.forEach(({ product }) => {
      next[product] = (next[product] || 0) + 1
    })
    return next
  }, [entries])

  const visibleProducts = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("de-CH")
    return PRODUCT_DEFINITIONS.filter((product) => {
      const categoryMatches = category === "all" || product.category === category
      const searchMatches =
        !needle ||
        product.label.toLocaleLowerCase("de-CH").includes(needle) ||
        product.description.toLocaleLowerCase("de-CH").includes(needle)
      return categoryMatches && searchMatches
    })
  }, [category, search])

  const annual = entries.reduce((sum, { contract }) => sum + annualCost(contract), 0)
  const monthly = annual / 12

  function openNew(product: string) {
    setEditing({ key: newContractKey(product, contracts), product, existing: false })
  }

  function save(key: string, next: Contract) {
    onChange({ ...contracts, [key]: next })
    setEditing(null)
  }

  function remove(key: string) {
    const copy = { ...contracts }
    delete copy[key]
    onChange(copy)
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-secondary/35 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0" aria-label="Vertragskategorien">
            <CategoryButton active={category === "all"} onClick={() => setCategory("all")}>
              Alle
            </CategoryButton>
            {PRODUCT_CATEGORIES.map((item) => (
              <CategoryButton
                key={item.id}
                active={category === item.id}
                onClick={() => setCategory(item.id)}
              >
                {item.label}
              </CategoryButton>
            ))}
          </div>

          <label className="relative block w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <span className="sr-only">Vertrag suchen</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Vertrag oder Abo suchen"
              className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleProducts.map((product) => {
            const count = counts[product.id] || 0
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => openNew(product.id)}
                className="group flex min-h-20 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_8px_22px_rgba(19,42,82,0.08)]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Plus className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{product.label}</span>
                    {count > 0 && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        {count}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{product.description}</span>
                </span>
              </button>
            )
          })}
        </div>

        {visibleProducts.length === 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-card px-4 py-5 text-center text-sm text-muted-foreground">
            Kein passender Vertrag gefunden. Wählen Sie «Weiteres Abo» oder erfassen Sie die Gesellschaft später frei.
          </div>
        )}
      </div>

      <section aria-labelledby="captured-contracts">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Erfasster Bestand</p>
            <h3 id="captured-contracts" className="mt-1 text-lg font-bold text-foreground">
              Verträge und Abonnemente
            </h3>
          </div>
          {entries.length > 0 && (
            <div className="flex gap-2 text-xs">
              <SummaryPill label="Verträge" value={String(entries.length)} />
              <SummaryPill label="Monatlich" value={chf(monthly)} />
              <SummaryPill label="Jährlich" value={chf(annual)} />
            </div>
          )}
        </div>

        <div className="mt-3 space-y-2.5">
          {entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/50 px-4 py-5 text-sm text-muted-foreground">
              Noch nichts erfasst. Wählen Sie oben eine Vertragsart oder ein Abo aus.
            </div>
          ) : (
            entries.map(({ key, contract, product }) => {
              const meta = definitionById.get(product)
              return (
                <article
                  key={key}
                  className="grid gap-3 rounded-xl border border-border bg-card px-4 py-3.5 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-foreground">{meta?.label ?? product}</span>
                      {meta && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {PRODUCT_CATEGORIES.find((item) => item.id === meta.category)?.shortLabel}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[13px] font-semibold text-primary">
                      {contract.company || "Anbieter noch offen"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-foreground">{chf(contract.premium ?? 0)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {INTERVALS[contract.interval || "monthly"]}
                      {contract.abl ? ` · Ablauf ${contract.abl}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      aria-label={`${meta?.label ?? product} bearbeiten`}
                      onClick={() => setEditing({ key, product, existing: true })}
                      className="rounded-lg p-2 text-primary hover:bg-primary/10"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`${meta?.label ?? product} entfernen`}
                      onClick={() => remove(key)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>

      {editing && (
        <ContractModal
          contractKey={editing.key}
          product={editing.product}
          current={contracts[editing.key] ?? {}}
          existing={editing.existing}
          onClose={() => setEditing(null)}
          onSave={save}
          onRemove={() => remove(editing.key)}
        />
      )}
    </div>
  )
}

function ContractModal({
  contractKey,
  product,
  current,
  existing,
  onClose,
  onSave,
  onRemove,
}: {
  contractKey: string
  product: string
  current: Contract
  existing: boolean
  onClose: () => void
  onSave: (key: string, next: Contract) => void
  onRemove: () => void
}) {
  const [productValue, setProductValue] = useState(current.product ?? product)
  const [company, setCompany] = useState(current.company ?? "")
  const [companyOpen, setCompanyOpen] = useState(false)
  const [pol, setPol] = useState(current.pol ?? "")
  const [start, setStart] = useState(current.start ?? "")
  const [abl, setAbl] = useState(current.abl ?? "")
  const [premium, setPremium] = useState(current.premium == null ? "" : String(current.premium))
  const [interval, setInterval] = useState(current.interval ?? "monthly")
  const [notes, setNotes] = useState(current.notes ?? "")
  const [error, setError] = useState("")

  const matches = useMemo(() => {
    const preferred = PROVIDERS_BY_PRODUCT[productValue] ?? []
    const options = [...new Set([...preferred, ...COMPANIES])]
    const needle = company.trim().toLocaleLowerCase("de-CH")
    return options.filter((name) => !needle || name.toLocaleLowerCase("de-CH").includes(needle)).slice(0, 14)
  }, [company, productValue])

  const productMeta = definitionById.get(productValue)

  function submit() {
    if (!company.trim()) {
      setError("Bitte einen Anbieter auswählen oder frei eintragen.")
      return
    }
    const num = Number(premium)
    if (premium === "" || !Number.isFinite(num) || num < 0) {
      setError("Bitte die Prämie oder Gebühr als gültigen Betrag erfassen.")
      return
    }
    onSave(contractKey, {
      product: productValue,
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
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(15,27,54,0.45)] p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="max-h-[calc(100vh-32px)] w-full max-w-2xl overflow-auto rounded-3xl bg-card p-5 shadow-[0_28px_80px_rgba(15,27,54,0.25)] sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">
              {productMeta?.category === "subscriptions" ? "Abonnement" : "Vertrag"}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {existing ? "Eintrag bearbeiten" : "Eintrag erfassen"}
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Anbieter und regelmässige Kosten festhalten. Nicht gefundene Anbieter können direkt eingetippt werden.
            </p>
          </div>
          <button
            type="button"
            aria-label="Schliessen"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Vertragsart">
            <select
              value={productValue}
              onChange={(event) => {
                setProductValue(event.target.value)
                setCompany("")
                setError("")
              }}
              className={inputClass}
            >
              {PRODUCT_CATEGORIES.map((group) => (
                <optgroup key={group.id} label={group.label}>
                  {PRODUCT_DEFINITIONS.filter((item) => item.category === group.id).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>

          <Field label="Anbieter / Gesellschaft">
            <div className="relative">
              <input
                value={company}
                onChange={(event) => {
                  setCompany(event.target.value)
                  setCompanyOpen(true)
                  setError("")
                }}
                onFocus={() => setCompanyOpen(true)}
                placeholder={productMeta?.category === "subscriptions" ? "z. B. Netflix oder Swisscom" : "z. B. Everon oder AXA"}
                className={inputClass}
              />
              {companyOpen && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1.5 max-h-52 overflow-auto rounded-xl border border-border bg-card shadow-[0_12px_28px_rgba(15,27,54,0.13)]">
                  {matches.length > 0 ? (
                    matches.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setCompany(name)
                          setCompanyOpen(false)
                          setError("")
                        }}
                        className="block w-full px-3 py-2.5 text-left text-[13px] hover:bg-accent hover:text-accent-foreground"
                      >
                        {name}
                      </button>
                    ))
                  ) : (
                    <span className="block px-3 py-2.5 text-[13px] text-muted-foreground">
                      Kein Treffer – Namen fertig eintippen und speichern
                    </span>
                  )}
                </div>
              )}
            </div>
          </Field>

          <Field label="Police / Vertragsnummer">
            <input value={pol} onChange={(event) => setPol(event.target.value)} placeholder="Optional" className={inputClass} />
          </Field>
          <Field label="Prämie / Gebühr (CHF)">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.05"
              value={premium}
              onChange={(event) => {
                setPremium(event.target.value)
                setError("")
              }}
              placeholder="0.00"
              className={inputClass}
            />
          </Field>
          <Field label="Zahlungsintervall">
            <select value={interval} onChange={(event) => setInterval(event.target.value)} className={inputClass}>
              {Object.entries(INTERVALS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Beginn">
            <input type="month" value={start} onChange={(event) => setStart(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Ablauf / Kündigung">
            <input value={abl} onChange={(event) => setAbl(event.target.value)} placeholder="z. B. 12.2027 oder monatlich" className={inputClass} />
          </Field>
          <Field label="Notizen" full>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional: Deckung, Paket, Kündigungsfrist oder Besonderheiten"
              className={`${inputClass} min-h-[88px] resize-y`}
            />
          </Field>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm font-semibold text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row">
          {existing ? (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/5"
            >
              Eintrag entfernen
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

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-colors ${
        active ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground hover:border-primary"
      }`}
    >
      {children}
    </button>
  )
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-xl border border-border bg-card px-3 py-2 text-muted-foreground">
      {label} <b className="ml-1 text-foreground">{value}</b>
    </span>
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

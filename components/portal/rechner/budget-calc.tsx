"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Trash2, ArrowRight } from "lucide-react"
import { formatCHF } from "@/lib/format"
import { CalcActionBar, type CalcContext } from "@/components/portal/rechner/calc-action-bar"
import { BudgetSankey } from "@/components/portal/rechner/budget-sankey"

type Item = { name: string; amount: number }
type Category = { name: string; color: string; subs: Item[] }

const PALETTE = ["#EE6A20", "#256ABF", "#159B8A", "#C2554E", "#3F7CC0", "#B07A1E"]

function defaultData(monthlyIncome?: number): { income: Item[]; cats: Category[] } {
  const lohn = monthlyIncome && monthlyIncome > 0 ? Math.round(monthlyIncome / 50) * 50 : 4500
  return {
    income: [
      { name: "Lohn (netto)", amount: lohn },
      { name: "Nebeneinkommen", amount: 0 },
    ],
    cats: [
      { name: "Fixkosten", color: PALETTE[0], subs: [{ name: "Miete", amount: 1500 }, { name: "Krankenkasse", amount: 400 }, { name: "Steuern", amount: 800 }] },
      { name: "Leben", color: PALETTE[1], subs: [{ name: "Essen", amount: 600 }, { name: "Transport", amount: 400 }, { name: "Hobbys", amount: 300 }] },
      { name: "Sparen", color: PALETTE[2], subs: [{ name: "Sparkonto", amount: 200 }, { name: "3a / ETF-Sparplan", amount: 500 }] },
    ],
  }
}

const clamp = (v: number) => (!isFinite(v) || v < 0 ? 0 : Math.min(v, 1e8))
const catTotal = (c: Category) => c.subs.reduce((t, s) => t + clamp(s.amount), 0)

export function BudgetCalc({
  defaults,
  ctx,
}: {
  defaults?: { monthlyIncome?: number }
  ctx?: CalcContext
}) {
  const [data, setData] = useState(() => defaultData(defaults?.monthlyIncome))

  const totals = useMemo(() => {
    const inc = data.income.reduce((t, x) => t + clamp(x.amount), 0)
    const exp = data.cats.reduce((t, c) => t + catTotal(c), 0)
    return { inc, exp, bal: inc - exp }
  }, [data])

  const savingsRate = totals.inc > 0 ? Math.round((Math.max(0, totals.bal) / totals.inc) * 100) : 0

  function update(fn: (draft: { income: Item[]; cats: Category[] }) => void) {
    setData((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }

  return (
    <>
      <CalcActionBar
        ctx={ctx ?? {}}
        calcKey="budget"
        buildPayload={() => ({
          calculator: "budget",
          inputs: {
            einkommen_monat: totals.inc,
            ausgaben_monat: totals.exp,
          },
          results: [
            `Einkommen ${formatCHF(totals.inc)}/Monat`,
            `Ausgaben ${formatCHF(totals.exp)}/Monat`,
            `Überschuss ${formatCHF(totals.bal)} (${savingsRate} % Sparquote)`,
          ],
        })}
        onReset={() => setData(defaultData(defaults?.monthlyIncome))}
      />

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric label="Einkommen / Monat" value={formatCHF(totals.inc)} />
        <Metric label="Ausgaben / Monat" value={formatCHF(totals.exp)} />
        <Metric
          label={`Überschuss (${savingsRate} % Sparquote)`}
          value={formatCHF(totals.bal)}
          tone={totals.bal > 0 ? "good" : totals.bal < 0 ? "crit" : undefined}
        />
      </div>

      {/* Flow */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Geldfluss
        </div>
        <div className="mt-4">
          <BudgetSankey income={data.income} cats={data.cats} />
        </div>
      </div>

      {/* Advice */}
      {totals.bal > 0.5 ? (
        <Advice
          tone="good"
          title={`Sie haben monatlich ${formatCHF(totals.bal)} übrig.`}
          body="Prüfen Sie in der Risikoanalyse, welche Vorsorge- und Anlagethemen für Sie die höchste Relevanz haben – statt das Geld auf dem Konto der Inflation zu überlassen."
          href={ctx?.analysisId ? `/analyse/${ctx.analysisId}?step=3` : "/dashboard"}
          cta="Zur Risikoanalyse"
        />
      ) : totals.bal < -0.5 ? (
        <Advice
          tone="crit"
          title={`Ihre Ausgaben übersteigen Ihr Einkommen um ${formatCHF(-totals.bal)}.`}
          body="Fixkosten wie Krankenkasse und Versicherungen sind oft der grösste Hebel – der Franchise-Vergleich zeigt Ihr Sparpotenzial."
          href="/rechner/franchise"
          cta="Franchise-Vergleich öffnen"
        />
      ) : null}

      {/* Editable form */}
      <div className="mt-4 space-y-4">
        <Group
          name="Einkommen"
          total={formatCHF(totals.inc)}
          accent="var(--primary)"
          onAdd={() => update((d) => d.income.push({ name: "Weitere Einnahme", amount: 0 }))}
          addLabel="+ Einkommen hinzufügen"
        >
          {data.income.map((x, i) => (
            <Row
              key={i}
              name={x.name}
              amount={x.amount}
              onName={(v) => update((d) => { d.income[i].name = v })}
              onAmount={(v) => update((d) => { d.income[i].amount = v })}
              onDelete={() => update((d) => { d.income.splice(i, 1) })}
            />
          ))}
        </Group>

        {data.cats.map((c, ci) => (
          <Group
            key={ci}
            name={c.name}
            editableName
            onName={(v) => update((d) => { d.cats[ci].name = v })}
            total={formatCHF(catTotal(c))}
            accent={c.color}
            onDelete={() => update((d) => { d.cats.splice(ci, 1) })}
            onAdd={() => update((d) => { d.cats[ci].subs.push({ name: "Neuer Posten", amount: 0 }) })}
            addLabel="+ Unterkategorie hinzufügen"
          >
            {c.subs.map((s, si) => (
              <Row
                key={si}
                name={s.name}
                amount={s.amount}
                onName={(v) => update((d) => { d.cats[ci].subs[si].name = v })}
                onAmount={(v) => update((d) => { d.cats[ci].subs[si].amount = v })}
                onDelete={() => update((d) => { d.cats[ci].subs.splice(si, 1) })}
              />
            ))}
          </Group>
        ))}

        <button
          type="button"
          onClick={() =>
            update((d) => {
              d.cats.push({ name: "Neue Kategorie", color: PALETTE[d.cats.length % PALETTE.length], subs: [] })
            })
          }
          className="w-full rounded-xl border border-dashed border-border py-3 text-sm font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          + Kategorie hinzufügen
        </button>
      </div>

      <p className="mt-4 text-[12.5px] text-muted-foreground">
        Richtwert: Eine Sparquote ab 15–20 % gilt als solide Basis. Beträge werden gerundet dargestellt, intern wird
        exakt gerechnet.
      </p>
    </>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" | "crit" }) {
  const color = tone === "crit" ? "text-destructive" : tone === "good" ? "text-success" : "text-foreground"
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-black tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

function Advice({
  tone,
  title,
  body,
  href,
  cta,
}: {
  tone: "good" | "crit"
  title: string
  body: string
  href: string
  cta: string
}) {
  return (
    <div
      className={`mt-4 rounded-2xl border border-l-4 border-border bg-card p-5 ${
        tone === "good" ? "border-l-success" : "border-l-destructive"
      }`}
    >
      <p className="text-[15px] font-black text-foreground">{title}</p>
      <p className="mt-1 text-[13.5px] text-muted-foreground">{body}</p>
      <Link
        href={href}
        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary-deep"
      >
        {cta}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

function Group({
  name,
  editableName,
  onName,
  total,
  accent,
  onAdd,
  addLabel,
  onDelete,
  children,
}: {
  name: string
  editableName?: boolean
  onName?: (v: string) => void
  total: string
  accent: string
  onAdd: () => void
  addLabel: string
  onDelete?: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4" style={{ borderLeft: `4px solid ${accent}` }}>
      <div className="flex items-center gap-2">
        {editableName ? (
          <input
            value={name}
            onChange={(e) => onName?.(e.target.value)}
            aria-label="Kategorie"
            className="min-w-0 flex-1 border-b border-transparent bg-transparent text-sm font-black uppercase tracking-wide text-foreground focus:border-primary focus:outline-none"
          />
        ) : (
          <span className="flex-1 text-sm font-black uppercase tracking-wide text-foreground">{name}</span>
        )}
        <span className="tabular-nums text-sm font-bold text-foreground">{total}</span>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Kategorie löschen"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="mt-2 space-y-2">{children}</div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-2.5 w-full rounded-lg border border-dashed border-border px-3 py-2 text-left text-[12.5px] font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        {addLabel}
      </button>
    </div>
  )
}

function Row({
  name,
  amount,
  onName,
  onAmount,
  onDelete,
}: {
  name: string
  amount: number
  onName: (v: string) => void
  onAmount: (v: number) => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        value={name}
        onChange={(e) => onName(e.target.value)}
        aria-label="Bezeichnung"
        className="min-w-0 flex-1 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm font-medium text-foreground focus:border-primary focus:outline-none"
      />
      <div className="flex items-stretch overflow-hidden rounded-lg border border-border">
        <button
          type="button"
          onClick={() => onAmount(clamp(amount - 50))}
          aria-label="Minus"
          className="w-8 bg-secondary/60 text-lg leading-none text-muted-foreground hover:bg-accent hover:text-primary"
        >
          –
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={50}
          value={amount}
          onChange={(e) => onAmount(clamp(Number(e.target.value)))}
          aria-label="Betrag"
          className="w-24 border-0 bg-transparent px-2 py-2 text-right text-sm font-bold tabular-nums text-foreground focus:outline-none"
        />
        <button
          type="button"
          onClick={() => onAmount(clamp(amount + 50))}
          aria-label="Plus"
          className="w-8 bg-secondary/60 text-lg leading-none text-muted-foreground hover:bg-accent hover:text-primary"
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Löschen"
        className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

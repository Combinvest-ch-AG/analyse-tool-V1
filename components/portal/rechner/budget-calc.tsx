"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Trash2, ArrowRight, RotateCcw } from "lucide-react"
import { formatCHF } from "@/lib/format"
import { budgetPalette } from "@/lib/data/chart-colors"
import { CalcActionBar, type CalcContext } from "@/components/portal/rechner/calc-action-bar"
import { BudgetSankey } from "@/components/portal/rechner/budget-sankey"
import { BudgetDonut } from "@/components/portal/rechner/budget-donut"
import { computeNetSalary, bvgEmployeeRate, AHV_IV_EO_RATE, ALV_RATE } from "@/lib/engine/salary"

const SALARY_KEY = "salary:net"

export type BudgetItem = { name: string; amount: number; sourceKey?: string }
export type BudgetCategory = { name: string; color: string; subs: BudgetItem[] }
export type SalaryState = { grossMonthly: number; age: number; netOverride: number | null }
export type BudgetData = { income: BudgetItem[]; cats: BudgetCategory[]; salary?: SalaryState }
export type ImportedBudgetCost = {
  sourceKey: string
  name: string
  amount: number
  group: "Versicherungen" | "Abonnemente" | "Finanzierung" | "Sparen & Vorsorge"
}

const PALETTE = budgetPalette

/**
 * Stellt sicher, dass ein Lohn-State und eine abgeleitete Nettolohn-Zeile
 * existieren. Migriert ältere Budgets, die noch eine "Bruttolohn"-Einkommens-
 * zeile (sourceKey "profile:brutto") führten, auf das neue Lohn-Modell.
 */
function ensureSalary(data: BudgetData, fallbackGross: number, age: number) {
  if (!data.salary) {
    const legacy = data.income.find(
      (item) => item.sourceKey === "profile:brutto" || item.name?.startsWith("Bruttolohn"),
    )
    const gross = legacy && legacy.amount > 0 ? Math.round(legacy.amount) : fallbackGross
    data.salary = { grossMonthly: gross, age, netOverride: null }
    data.income = data.income.filter(
      (item) => item.sourceKey !== "profile:brutto" && !item.name?.startsWith("Bruttolohn"),
    )
  }
  syncNetLine(data)
}

/** Schreibt den berechneten (oder manuell überschriebenen) Nettolohn als Einkommenszeile. */
function syncNetLine(data: BudgetData) {
  const salary = data.salary
  if (!salary) return
  const net = salary.netOverride != null ? salary.netOverride : Math.round(computeNetSalary(salary.grossMonthly, salary.age).net)
  const line = data.income.find((item) => item.sourceKey === SALARY_KEY)
  if (line) {
    line.amount = net
    line.name = "Nettolohn"
  } else {
    data.income.unshift({ name: "Nettolohn", amount: net, sourceKey: SALARY_KEY })
  }
}

function defaultData(
  monthlyIncome?: number,
  profiledIncome = false,
  importedCosts: ImportedBudgetCost[] = [],
  savedData?: BudgetData,
  age = 35,
  netOverride: number | null = null,
): BudgetData {
  const lohn = monthlyIncome && monthlyIncome > 0 ? Math.round(monthlyIncome) : 0
  const data: BudgetData = savedData
    ? structuredClone(savedData)
    : {
        salary: { grossMonthly: lohn, age, netOverride },
        income: [{ name: "Nebeneinkommen", amount: 0 }],
        cats: [
          { name: "Fixkosten", color: PALETTE[0], subs: [{ name: "Miete", amount: 0 }, { name: "Steuern", amount: 0 }] },
          { name: "Leben", color: PALETTE[1], subs: [{ name: "Essen", amount: 0 }, { name: "Transport", amount: 0 }, { name: "Freizeit", amount: 0 }] },
          { name: "Sparen", color: PALETTE[2], subs: [{ name: "Freies Sparen", amount: 0 }] },
        ],
      }

  ensureSalary(data, lohn, age)

  data.cats.forEach((category) => {
    category.subs = category.subs.filter((item) => !item.sourceKey?.startsWith("contract:"))
  })

  importedCosts.forEach((cost) => {
    let category = data.cats.find((item) => item.name === cost.group)
    if (!category) {
      category = {
        name: cost.group,
        color: PALETTE[data.cats.length % PALETTE.length],
        subs: [],
      }
      data.cats.push(category)
    }
    category.subs.push({ name: cost.name, amount: cost.amount, sourceKey: cost.sourceKey })
  })

  return data
}

const clamp = (v: number) => (!isFinite(v) || v < 0 ? 0 : Math.min(v, 1e8))
const catTotal = (c: BudgetCategory) => c.subs.reduce((t, s) => t + clamp(s.amount), 0)

export function BudgetCalc({
  defaults,
  importedCosts = [],
  savedData,
  ctx,
}: {
  defaults?: { monthlyIncome?: number; profiledIncome?: boolean; age?: number; netOverride?: number | null }
  importedCosts?: ImportedBudgetCost[]
  savedData?: BudgetData
  ctx?: CalcContext
}) {
  const [data, setData] = useState(() =>
    defaultData(defaults?.monthlyIncome, defaults?.profiledIncome, importedCosts, savedData, defaults?.age, defaults?.netOverride ?? null),
  )
  const [flowView, setFlowView] = useState<"flow" | "split">("flow")

  const totals = useMemo(() => {
    const inc = data.income.reduce((t, x) => t + clamp(x.amount), 0)
    const exp = data.cats.reduce((t, c) => t + catTotal(c), 0)
    return { inc, exp, bal: inc - exp }
  }, [data])

  const savingsRate = totals.inc > 0 ? Math.round((Math.max(0, totals.bal) / totals.inc) * 100) : 0
  const imported = useMemo(() => {
    const items = data.cats.flatMap((category) =>
      category.subs.filter((item) => item.sourceKey?.startsWith("contract:")),
    )
    return { count: items.length, total: items.reduce((sum, item) => sum + clamp(item.amount), 0) }
  }, [data])

  function update(fn: (draft: BudgetData) => void) {
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
            vertragskosten_monat: imported.total,
            data,
          },
          results: [
            `Einkommen ${formatCHF(totals.inc)}/Monat`,
            `Ausgaben ${formatCHF(totals.exp)}/Monat`,
            `Überschuss ${formatCHF(totals.bal)} (${savingsRate} % Sparquote)`,
          ],
        })}
        onReset={() =>
          setData(defaultData(defaults?.monthlyIncome, defaults?.profiledIncome, importedCosts, savedData, defaults?.age, defaults?.netOverride ?? null))
        }
      />

      {imported.count > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-foreground">
              {imported.count} Vertragskosten automatisch übernommen
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Zahlungsintervalle wurden auf den Monatsbetrag umgerechnet.
            </p>
          </div>
          <span className="text-sm font-black tabular-nums text-primary">{formatCHF(imported.total)} / Monat</span>
        </div>
      )}

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-foreground">
              {flowView === "flow" ? "Ihr monatlicher Geldfluss" : "Ihre Budget-Aufteilung"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {flowView === "flow"
                ? "Fahren Sie über eine Verbindung, um Betrag und Anteil exakt zu sehen."
                : "Wechseln Sie zwischen Ausgaben und Einnahmen oder tippen Sie eine Kategorie an."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                totals.bal >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}
            >
              {totals.bal >= 0 ? "Überschuss" : "Defizit"} {formatCHF(Math.abs(totals.bal))}
            </span>
            <div className="flex flex-none rounded-lg border border-border bg-secondary/40 p-0.5">
              {(["flow", "split"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFlowView(v)}
                  aria-pressed={flowView === v}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                    flowView === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v === "flow" ? "Fluss" : "Aufteilung"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4">
          {flowView === "flow" ? (
            <BudgetSankey income={data.income} cats={data.cats} />
          ) : (
            <BudgetDonut income={data.income} cats={data.cats} />
          )}
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
          href={
            ctx?.analysisId
              ? `/rechner/franchise?aid=${encodeURIComponent(ctx.analysisId)}&cid=${encodeURIComponent(ctx.customerId ?? "")}`
              : "/rechner/franchise"
          }
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
          {data.salary && (
            <SalaryPanel
              salary={data.salary}
              onGross={(v) => update((d) => { d.salary!.grossMonthly = v; syncNetLine(d) })}
              onAge={(v) => update((d) => { d.salary!.age = v; syncNetLine(d) })}
              onNetOverride={(v) => update((d) => { d.salary!.netOverride = v; syncNetLine(d) })}
              onResetNet={() => update((d) => { d.salary!.netOverride = null; syncNetLine(d) })}
            />
          )}
          {data.income.map((x, i) =>
            x.sourceKey === SALARY_KEY ? null : (
              <Row
                key={i}
                name={x.name}
                amount={x.amount}
                onName={(v) => update((d) => { d.income[i].name = v })}
                onAmount={(v) => update((d) => { d.income[i].amount = v })}
                onDelete={() => update((d) => { d.income.splice(i, 1) })}
              />
            ),
          )}
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
        Alle Beträge beruhen auf Ihren Eingaben. Die Darstellung wird auf ganze Franken gerundet, intern wird exakt gerechnet.
      </p>
    </>
  )
}

function SalaryPanel({
  salary,
  onGross,
  onAge,
  onNetOverride,
  onResetNet,
}: {
  salary: SalaryState
  onGross: (v: number) => void
  onAge: (v: number) => void
  onNetOverride: (v: number) => void
  onResetNet: () => void
}) {
  const b = computeNetSalary(salary.grossMonthly, salary.age)
  const isManual = salary.netOverride != null
  const net = isManual ? salary.netOverride! : Math.round(b.net)

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
      {/* Bruttolohn */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">Bruttolohn / Monat</span>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Alter
            <input
              type="number"
              inputMode="numeric"
              min={18}
              max={70}
              value={salary.age}
              onChange={(e) => onAge(clamp(Number(e.target.value)))}
              aria-label="Alter für BVG-Berechnung"
              className="w-14 rounded-md border border-border bg-background px-2 py-1 text-right text-xs font-bold tabular-nums text-foreground focus:border-primary focus:outline-none"
            />
          </label>
        </div>
        <AmountStepper value={salary.grossMonthly} onChange={onGross} />
      </div>

      {/* Abzüge */}
      <div className="mt-3 space-y-1.5 border-t border-primary/15 pt-3 text-[13px]">
        <DeductionRow label={`AHV / IV / EO (${(AHV_IV_EO_RATE * 100).toFixed(1)} %)`} value={b.ahvIvEo} />
        <DeductionRow label={`ALV (${(ALV_RATE * 100).toFixed(1)} %)`} value={b.alv} />
        <DeductionRow
          label={`BVG Pensionskasse (${(b.bvgRate * 100).toFixed(1)} %)`}
          value={b.bvg}
          hint={b.bvgRate === 0 ? "18–24: kein Sparbeitrag" : undefined}
        />
        <div className="flex items-center justify-between pt-1 text-muted-foreground">
          <span className="font-semibold">Total Abzüge</span>
          <span className="tabular-nums font-bold">− {formatCHF(Math.round(b.totalDeductions))}</span>
        </div>
      </div>

      {/* Nettolohn */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-primary/15 pt-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-foreground">Nettolohn / Monat</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              isManual ? "bg-accent text-primary" : "bg-success/10 text-success"
            }`}
          >
            {isManual ? "manuell" : "automatisch"}
          </span>
          {isManual && (
            <button
              type="button"
              onClick={onResetNet}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              <RotateCcw className="h-3 w-3" /> Auto
            </button>
          )}
        </div>
        <div className="flex items-stretch overflow-hidden rounded-lg border border-primary/40 bg-background">
          <span className="flex items-center px-2 text-xs font-semibold text-muted-foreground">CHF</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={50}
            value={net}
            onChange={(e) => onNetOverride(clamp(Number(e.target.value)))}
            aria-label="Nettolohn (überschreibbar)"
            className="w-28 border-0 bg-transparent px-2 py-2 text-right text-sm font-black tabular-nums text-foreground focus:outline-none"
          />
        </div>
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
        Automatisch aus dem Bruttolohn geschätzt (Arbeitnehmeranteile). Kennen Sie den exakten Nettolohn, tragen Sie ihn
        direkt ein – er wird als Einkommen ins Budget übernommen.
      </p>
    </div>
  )
}

function DeductionRow({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>
        {label}
        {hint ? <span className="ml-1 text-[11px] opacity-70">· {hint}</span> : null}
      </span>
      <span className="tabular-nums">− {formatCHF(Math.round(value))}</span>
    </div>
  )
}

function AmountStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-lg border border-border bg-background">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 100))}
        aria-label="Minus"
        className="w-8 bg-secondary/60 text-lg leading-none text-muted-foreground hover:bg-accent hover:text-primary"
      >
        –
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={100}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        aria-label="Bruttolohn pro Monat"
        className="w-28 border-0 bg-transparent px-2 py-2 text-right text-sm font-bold tabular-nums text-foreground focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 100))}
        aria-label="Plus"
        className="w-8 bg-secondary/60 text-lg leading-none text-muted-foreground hover:bg-accent hover:text-primary"
      >
        +
      </button>
    </div>
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

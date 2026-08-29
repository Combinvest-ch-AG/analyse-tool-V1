import type { Metadata } from "next"
import { CalcShell } from "@/components/portal/rechner/calc-shell"
import {
  BudgetCalc,
  type BudgetData,
  type ImportedBudgetCost,
} from "@/components/portal/rechner/budget-calc"
import { getAnalysis } from "@/lib/data/portal"
import {
  PRODUCT_DEFINITIONS,
  contractMonthlyAmount,
  type Contract,
  type Contracts,
  type ProductCategory,
  type WizardAnswers,
} from "@/lib/wizard/schema"

export const metadata: Metadata = {
  title: "Budgetrechner · Combinvest",
  description: "Einnahmen und Ausgaben erfassen: Geldfluss, Sparquote und monatlicher Überschuss auf einen Blick.",
}

const productById = new Map(PRODUCT_DEFINITIONS.map((product) => [product.id, product]))

const budgetGroup: Record<ProductCategory, ImportedBudgetCost["group"]> = {
  insurance: "Versicherungen",
  subscriptions: "Abonnemente",
  financing: "Finanzierung",
  wealth: "Sparen & Vorsorge",
}

function contractProduct(key: string, contract: Contract): string {
  return contract.product || key.split("::")[0]
}

function contractCosts(contracts: Contracts): ImportedBudgetCost[] {
  return Object.entries(contracts).flatMap(([key, contract]) => {
    const amount = contractMonthlyAmount(contract)
    if (amount <= 0) return []
    const product = contractProduct(key, contract)
    const meta = productById.get(product)
    return [{
      sourceKey: `contract:${key}`,
      name: `${contract.company || "Anbieter offen"} · ${meta?.label ?? product}`,
      amount,
      group: budgetGroup[meta?.category ?? "insurance"],
    }]
  })
}

function storedBudgetData(value: unknown): BudgetData | undefined {
  if (!value || typeof value !== "object") return undefined
  const data = value as Partial<BudgetData>
  return Array.isArray(data.income) && Array.isArray(data.cats) ? data as BudgetData : undefined
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ aid?: string; cid?: string }>
}) {
  const sp = await searchParams
  const ctx = { analysisId: sp.aid, customerId: sp.cid }
  const analysis = sp.aid ? await getAnalysis(sp.aid) : null
  const snapshot = (analysis?.latest_snapshot ?? {}) as {
    answers?: WizardAnswers
    contracts?: Contracts
    calculatorResults?: {
      budget?: { inputs?: { data?: unknown } }
    }
  }
  const annualGrossIncome = Math.max(0, Number(snapshot.answers?.brutto) || 0)
  const profiledAge = Math.max(18, Math.min(70, Number(snapshot.answers?.alter) || 35))
  const importedCosts = contractCosts(snapshot.contracts ?? {})
  const savedData = storedBudgetData(snapshot.calculatorResults?.budget?.inputs?.data)
  return (
    <CalcShell
      eyebrow="Haushalt · Einnahmen & Ausgaben"
      title="Wohin fliesst Ihr Geld?"
      lead="Erfassen Sie Einnahmen und Ausgaben – Geldfluss, Sparquote und der monatliche Überschuss aktualisieren sich in Echtzeit."
      backHref="/rechner"
      backLabel="Rechner"
      analysisId={sp.aid}
      chip="Haushaltsbudget"
      explain="Die Sparquote zeigt, welcher Anteil Ihres Einkommens monatlich übrig bleibt."
      source="Profiling, Vertragscheck und Ihre ergänzten Budgetangaben; keine automatisch ergänzten Schätzwerte."
    >
      <BudgetCalc
        ctx={ctx}
        defaults={{
          age: profiledAge,
          ...(annualGrossIncome > 0 ? { monthlyIncome: annualGrossIncome / 12, profiledIncome: true } : {}),
        }}
        importedCosts={importedCosts}
        savedData={savedData}
      />
    </CalcShell>
  )
}

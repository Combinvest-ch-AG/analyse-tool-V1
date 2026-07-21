import { CalcShell } from "@/components/portal/rechner/calc-shell"
import { PensionGapCalc } from "@/components/portal/rechner/pension-gap-calc"

export const metadata = {
  title: "Vorsorgerechner · Combinvest",
}

export default async function VorsorgePage({
  searchParams,
}: {
  searchParams: Promise<{ salary?: string; age?: string; children?: string }>
}) {
  const sp = await searchParams
  const salary = Number(sp.salary) || undefined
  const age = Number(sp.age) || undefined
  const children = Number(sp.children) || undefined
  return (
    <CalcShell
      eyebrow="Vorsorge & Rentenlücke"
      title="Wie gross ist Ihre Vorsorgelücke?"
      lead="Deckungslücke bei Invalidität, Pensionierung und Todesfall — automatisch nach AHV-Skala 44 (2025/2026) und BVG-Minimum."
      backHref="/rechner"
      backLabel="Rechner"
      chip="AHV-Skala 44"
    >
      <PensionGapCalc defaults={{ salary, age, children }} />
    </CalcShell>
  )
}

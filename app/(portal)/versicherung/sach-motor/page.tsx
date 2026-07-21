import type { Metadata } from "next"
import { CalcShell } from "@/components/portal/rechner/calc-shell"
import { SachMotorCheck } from "@/components/portal/versicherung/sach-motor-check"

export const metadata: Metadata = {
  title: "Sach- & Motorfahrzeug-Check · Combinvest",
  description: "Hausrat, Privathaftpflicht und Motorfahrzeug strukturiert auf Deckungslücken prüfen.",
}

export default async function SachMotorPage({
  searchParams,
}: {
  searchParams: Promise<{ aid?: string; cid?: string }>
}) {
  const sp = await searchParams
  const ctx = { analysisId: sp.aid, customerId: sp.cid }
  const back = sp.aid ? `/versicherung/uebersicht?aid=${sp.aid}&cid=${sp.cid ?? ""}` : "/versicherung/uebersicht"
  return (
    <CalcShell
      eyebrow="Sach- & Motorfahrzeugversicherung"
      title="Wo bestehen Deckungslücken?"
      lead="Erfassen Sie bestehende Deckungen für Hausrat, Privathaftpflicht und Motorfahrzeug. Über das Info-Symbol sehen Sie, was die jeweilige Deckung leistet."
      backHref={back}
      backLabel="Versicherungsübersicht"
      chip="Bedarfsanalyse"
      source="Hausrat und Privathaftpflicht sind freiwillige VVG-Verträge; die Motorfahrzeug-Haftpflicht ist in der Schweiz obligatorisch."
    >
      <SachMotorCheck ctx={ctx} />
    </CalcShell>
  )
}

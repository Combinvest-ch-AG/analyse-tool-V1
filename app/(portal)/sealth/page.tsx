import type { Metadata } from "next"
import { CalcShell } from "@/components/portal/rechner/calc-shell"
import { SealthCheck } from "@/components/portal/sealth/sealth-check"

export const metadata: Metadata = {
  title: "Sealth Bedarfscheck · Combinvest",
  description:
    "Persönlicher Bedarfscheck für das passende Sealth-Paket: Finanzcoaching, Steuern, Versicherungsservice, Gesundheit, Rechtsschutz und persönliche Entwicklung.",
}

export default async function SealthPage({
  searchParams,
}: {
  searchParams: Promise<{ aid?: string; cid?: string }>
}) {
  const sp = await searchParams
  const ctx = { analysisId: sp.aid, customerId: sp.cid }
  const back = sp.aid ? `/analyse/${sp.aid}?step=3` : "/dashboard"
  return (
    <CalcShell
      eyebrow="Self · Health · Wealth"
      title="Welches Sealth-Paket passt zu Ihnen?"
      lead="Persönlicher Bedarfscheck für Finanzcoaching, Steuererklärung, Versicherungsservice, Gesundheit, Rechtsschutz und persönliche Entwicklung."
      backHref={back}
      backLabel={sp.aid ? "Analyse" : "Dashboard"}
      chip="Sealth Bedarfscheck"
      source="Die Empfehlung basiert auf Ihren Antworten. Preise verstehen sich als Richtwerte; das Finanzszenario vergleicht nur eingetragene, potenziell ersetzbare Aufwände."
    >
      <SealthCheck ctx={ctx} />
    </CalcShell>
  )
}

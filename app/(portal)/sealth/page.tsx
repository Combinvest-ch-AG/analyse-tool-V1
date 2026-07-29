import type { Metadata } from "next"
import { CalcShell } from "@/components/portal/rechner/calc-shell"
import { SealthCheck } from "@/components/portal/sealth/sealth-check"
import { getAnalysis } from "@/lib/data/portal"
import type { WizardAnswers } from "@/lib/wizard/schema"

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
  const analysis = sp.aid ? await getAnalysis(sp.aid) : null
  const snapshot = (analysis?.latest_snapshot ?? {}) as { answers?: WizardAnswers }
  const profile = snapshot.answers
    ? {
        frequency: typeof snapshot.answers.sport === "string" ? snapshot.answers.sport : undefined,
        activity: typeof snapshot.answers.sport_art === "string" ? snapshot.answers.sport_art : undefined,
        location: typeof snapshot.answers.sport_ort === "string" ? snapshot.answers.sport_ort : undefined,
      }
    : undefined
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
      <SealthCheck ctx={ctx} profileSport={profile} />
    </CalcShell>
  )
}

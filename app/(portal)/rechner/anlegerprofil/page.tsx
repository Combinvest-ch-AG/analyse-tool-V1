import type { Metadata } from "next"
import { CalcShell } from "@/components/portal/rechner/calc-shell"
import { AnlegerprofilCalc } from "@/components/portal/rechner/anlegerprofil-calc"

export const metadata: Metadata = {
  title: "Anlegerprofil · Combinvest",
  description: "Ermitteln Sie in acht Fragen Risikobereitschaft, Anlagehorizont und Erfahrung – mit Richtwert für die passende Aktienquote.",
}

export default async function AnlegerprofilPage({
  searchParams,
}: {
  searchParams: Promise<{ aid?: string; cid?: string }>
}) {
  const sp = await searchParams
  const ctx = { analysisId: sp.aid, customerId: sp.cid }
  return (
    <CalcShell
      eyebrow="Anlageberatung · FIDLEG-Logik"
      title="Anlegerprofil bestimmen"
      lead="Acht kurze Fragen zu Risikobereitschaft, Anlagehorizont und Erfahrung ergeben ein Profil mit passender Aktienquote als Ausgangspunkt für das Gespräch."
      backHref="/rechner"
      backLabel="Rechner"
      analysisId={sp.aid}
      chip="8 Fragen"
      explain="Aus den Antworten wird ein gewichteter Score und ein Anlegerprofil abgeleitet."
      source="Gewichtung nach FIDLEG-Logik: Risiko 50 %, Horizont 30 %, Wissen 20 %."
    >
      <AnlegerprofilCalc ctx={ctx} />
    </CalcShell>
  )
}

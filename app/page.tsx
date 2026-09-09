import type { Metadata } from "next"
import { SiteHeader } from "@/components/marketing/site-header"
import { Hero } from "@/components/marketing/hero"
import { ProcessSection } from "@/components/marketing/process-section"
import { CalculatorsSection } from "@/components/marketing/calculators-section"
import { TrustSection } from "@/components/marketing/trust-section"
import { CtaSection } from "@/components/marketing/cta-section"
import { SiteFooter } from "@/components/marketing/site-footer"

export const metadata: Metadata = {
  title: "Combinvest — Schweizer Finanzberatung & Vermögensplanung",
  description:
    "Die Advisory Engine für Schweizer Finanzberater: ganzheitliche Analyse von Vorsorge, Vermögen und Versicherung mit deterministischen Schweizer Rechnern und priorisierten Empfehlungen.",
}

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <ProcessSection />
        <CalculatorsSection />
        <TrustSection />
        <CtaSection />
      </main>
      <SiteFooter />
    </div>
  )
}

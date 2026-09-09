import { NextResponse } from "next/server"
import { getCurrentAdvisor } from "@/lib/auth/advisor"
import { calculatePropertyGainTax, type PropertyGainInput } from "@/lib/tax/property-gains"

export const dynamic = "force-dynamic"

function finite(value: unknown, min = 0, max = 100_000_000) {
  const number = Number(value)
  return Number.isFinite(number) && number >= min && number <= max
}

function valid(input: PropertyGainInput) {
  return Boolean(
    input &&
    Number.isInteger(input.taxYear) && input.taxYear >= 2020 && input.taxYear <= 2026 &&
    input.location?.TaxLocationID > 0 &&
    /^[A-Z]{2}$/.test(input.location?.Canton ?? "") &&
    [1, 2, 3, 4, 5].includes(input.confession) &&
    finite(input.salePrice) &&
    finite(input.purchasePrice) &&
    finite(input.investments) &&
    finite(input.transactionCosts) &&
    finite(input.deferredPriorGain) &&
    finite(input.holdingYears, 0, 200) &&
    finite(input.replacementPrice),
  )
}

export async function POST(request: Request) {
  if (!(await getCurrentAdvisor())) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Bitte melden Sie sich erneut an." } }, { status: 401 })
  }

  let input: PropertyGainInput
  try {
    input = (await request.json()) as PropertyGainInput
  } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON", message: "Die Eingaben konnten nicht gelesen werden." } }, { status: 400 })
  }

  if (!valid(input)) {
    return NextResponse.json({ error: { code: "INVALID_INPUT", message: "Bitte prüfen Sie Steuerort, Verkaufspreis und Anlagekosten." } }, { status: 422 })
  }

  try {
    const result = await calculatePropertyGainTax(input)
    return NextResponse.json({ data: result, meta: { calculatedAt: new Date().toISOString() } })
  } catch {
    return NextResponse.json({ error: { code: "OFFICIAL_SOURCE_UNAVAILABLE", message: "Die amtliche kantonale Quelle ist vorübergehend nicht erreichbar. Es wird kein Schätzwert angezeigt." } }, { status: 503 })
  }
}

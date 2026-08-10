import { NextResponse } from "next/server"
import {
  calculateCapitalBenefitTax,
  calculateIncomeTax,
  calculatePillar3aTax,
  TAX_DATA_YEAR,
  type TaxProfile,
} from "@/lib/tax/estv"
import { getCurrentAdvisor } from "@/lib/auth/advisor"

export const dynamic = "force-dynamic"

type CalculationRequest = {
  mode: "income" | "pillar3a" | "capital"
  profile: TaxProfile
  additionalDeductions?: number
  pillar3aContribution?: number
  hasPensionFund?: boolean
  capital?: number
  gender?: 1 | 2
  ageAtPayment?: number
}

function finite(value: unknown, min = 0, max = 100_000_000) {
  const number = Number(value)
  return Number.isFinite(number) && number >= min && number <= max
}

function validate(input: CalculationRequest) {
  const profile = input.profile
  if (!profile || !["income", "pillar3a", "capital"].includes(input.mode)) return false
  if (!Number.isInteger(profile.taxYear) || profile.taxYear < 2010 || profile.taxYear > TAX_DATA_YEAR) return false
  if (!Number.isInteger(profile.taxLocationId) || profile.taxLocationId <= 0) return false
  if (![1, 2, 3, 4].includes(profile.relationship)) return false
  if (![1, 2, 3, 4, 5].includes(profile.confession1)) return false
  if (!finite(profile.age1, 18, 100) || !finite(profile.grossIncome1)) return false
  if (!finite(profile.grossIncome2 ?? 0) || !finite(profile.fortune)) return false
  if (!Array.isArray(profile.children) || profile.children.some((age) => !finite(age, 0, 100))) return false
  return true
}

export async function POST(request: Request) {
  if (!(await getCurrentAdvisor())) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Bitte melden Sie sich erneut an." } },
      { status: 401 },
    )
  }

  let input: CalculationRequest
  try {
    input = (await request.json()) as CalculationRequest
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Die Eingaben konnten nicht gelesen werden." } },
      { status: 400 },
    )
  }

  if (!validate(input)) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "Bitte prüfen Sie Ort, Einkommen und persönliche Angaben." } },
      { status: 422 },
    )
  }

  if (
    !finite(input.additionalDeductions ?? 0) ||
    !finite(input.pillar3aContribution ?? 0) ||
    !finite(input.capital ?? 0) ||
    !finite(input.ageAtPayment ?? 65, 18, 100)
  ) {
    return NextResponse.json(
      { error: { code: "INVALID_AMOUNT", message: "Bitte prüfen Sie die eingegebenen Beträge." } },
      { status: 422 },
    )
  }

  try {
    const result =
      input.mode === "pillar3a"
        ? await calculatePillar3aTax(
            input.profile,
            Number(input.pillar3aContribution ?? 0),
            input.hasPensionFund !== false,
          )
        : input.mode === "capital"
          ? await calculateCapitalBenefitTax(
              input.profile,
              Number(input.capital ?? 0),
              input.gender === 2 ? 2 : 1,
              Number(input.ageAtPayment ?? 65),
            )
          : await calculateIncomeTax(
              input.profile,
              Math.min(Number(input.additionalDeductions ?? 0), input.profile.grossIncome1 + (input.profile.grossIncome2 ?? 0)),
            )

    return NextResponse.json({
      data: result,
      meta: {
        source: "Eidgenössische Steuerverwaltung (ESTV)",
        taxYear: input.profile.taxYear,
        calculatedAt: new Date().toISOString(),
      },
    })
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "ESTV_UNAVAILABLE",
          message: "Die offizielle Steuerberechnung ist vorübergehend nicht erreichbar. Es wird kein Schätzwert angezeigt.",
        },
      },
      { status: 503 },
    )
  }
}

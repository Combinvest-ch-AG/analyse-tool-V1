import { NextResponse } from "next/server"
import { searchTaxLocations, TAX_DATA_YEAR } from "@/lib/tax/estv"
import { getCurrentAdvisor } from "@/lib/auth/advisor"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  if (!(await getCurrentAdvisor())) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Bitte melden Sie sich erneut an." } },
      { status: 401 },
    )
  }

  const url = new URL(request.url)
  const query = (url.searchParams.get("q") ?? "").trim()
  const year = Number(url.searchParams.get("year") ?? TAX_DATA_YEAR)

  if (query.length < 2) {
    return NextResponse.json({ data: [], meta: { taxYear: year, source: "ESTV" } })
  }
  if (!Number.isInteger(year) || year < 2010 || year > TAX_DATA_YEAR) {
    return NextResponse.json(
      { error: { code: "INVALID_TAX_YEAR", message: "Das Steuerjahr ist ungültig." } },
      { status: 422 },
    )
  }

  try {
    const data = await searchTaxLocations(query, year)
    return NextResponse.json({ data: data.slice(0, 12), meta: { taxYear: year, source: "ESTV" } })
  } catch {
    return NextResponse.json(
      { error: { code: "ESTV_UNAVAILABLE", message: "Die ESTV-Ortssuche ist vorübergehend nicht erreichbar." } },
      { status: 503 },
    )
  }
}

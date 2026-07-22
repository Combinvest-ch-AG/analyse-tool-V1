import { NextResponse } from "next/server"
import { unstable_cache } from "next/cache"

export const runtime = "nodejs"
export const revalidate = 86400 // premiums are annual — refresh at most once per day

/**
 * Official BAG / Priminfo open-data premium export (whole of Switzerland).
 * Published yearly on opendata.swiss; the download link below is the stable
 * machine endpoint behind that dataset. One row per
 * insurer × region × age × accident × model × franchise.
 */
const CSV_URL =
  "https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL1Byw6RtaWVuX0NILmNzdg%3D%3D"

const CANTON_RE = /^[A-Z]{2}$/
const EXCLUDED = new Set(["ZE", "ZR"]) // non-geographic pseudo-cantons in the export

type Offer = {
  r: number
  a: string
  i: number
  u: "MIT" | "OHNE"
  y: string
  t: string
  n: string
  s: string
  p: [number, number][]
}

// Column order of Praemien_CH.csv (comma separated, no quoting, 17 columns).
const COL = {
  insurer: 0,
  canton: 1,
  year: 3,
  region: 5,
  ageClass: 6,
  accident: 7,
  tariff: 8,
  tariffType: 9,
  subgroup: 10,
  franchise: 12,
  premium: 13,
  label: 16,
} as const

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

/** Download the national CSV and reduce it to one canton's compact offer list. */
async function buildLive(canton: string): Promise<{ year: number; offers: Offer[] }> {
  const res = await fetch(CSV_URL, {
    // The result of this whole function is cached by unstable_cache; the 22 MB
    // body itself is too large for the data cache, so never cache it here.
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
    headers: { accept: "text/csv,*/*" },
  })
  if (!res.ok) throw new Error(`Prämien-Quelle antwortete mit ${res.status}`)
  const text = await res.text()

  const grouped = new Map<string, { offer: Omit<Offer, "p">; premiums: Map<number, number> }>()
  let year = 0

  const lines = text.split("\n")
  for (let idx = 1; idx < lines.length; idx++) {
    const line = lines[idx]
    if (!line) continue
    const f = line.split(",")
    if (f.length < 17) continue
    if (f[COL.canton] !== canton) continue

    const region = Number.parseInt(f[COL.region].replace("PR-REG CH", ""), 10)
    const franchise = Number.parseInt(f[COL.franchise].replace("FRA-", ""), 10)
    const premium = Number.parseFloat(f[COL.premium])
    if (!Number.isFinite(region) || !Number.isFinite(franchise) || !Number.isFinite(premium)) continue

    const gj = Number.parseInt(f[COL.year], 10)
    if (Number.isFinite(gj) && gj > year) year = gj

    const insurer = Number.parseInt(f[COL.insurer], 10)
    const age = f[COL.ageClass].replace("AKL-", "")
    const accident: "MIT" | "OHNE" = f[COL.accident].startsWith("MIT-") ? "MIT" : "OHNE"
    const tariffType = f[COL.tariffType].replace("TAR-", "")
    const tariff = f[COL.tariff]
    const label = collapseSpaces(f[COL.label])
    const subgroup = f[COL.subgroup]

    const key = `${region}|${age}|${insurer}|${accident}|${tariffType}|${tariff}|${label}|${subgroup}`
    let entry = grouped.get(key)
    if (!entry) {
      entry = {
        offer: { r: region, a: age, i: insurer, u: accident, y: tariffType, t: tariff, n: label, s: subgroup },
        premiums: new Map(),
      }
      grouped.set(key, entry)
    }
    entry.premiums.set(franchise, premium)
  }

  const offers: Offer[] = []
  for (const { offer, premiums } of grouped.values()) {
    const p = [...premiums.entries()].sort((a, b) => a[0] - b[0]) as [number, number][]
    offers.push({ ...offer, p })
  }
  offers.sort(
    (a, b) => a.r - b.r || a.a.localeCompare(b.a) || a.u.localeCompare(b.u) || a.i - b.i || a.n.localeCompare(b.n),
  )

  if (!offers.length) throw new Error(`Keine Prämien für Kanton ${canton} gefunden`)
  return { year: year || new Date().getFullYear(), offers }
}

const livePremiums = (canton: string) =>
  unstable_cache(() => buildLive(canton), ["franchise-premiums", canton], {
    revalidate: 86400,
    tags: ["franchise-premiums"],
  })()

export async function GET(request: Request, { params }: { params: Promise<{ canton: string }> }) {
  const { canton: raw } = await params
  const canton = (raw || "").toUpperCase()

  if (!CANTON_RE.test(canton) || EXCLUDED.has(canton)) {
    return NextResponse.json({ error: "Ungültiger Kanton." }, { status: 400 })
  }

  // 1) Live official data (cached 24h). 2) Bundled 2026 snapshot as a safety net.
  try {
    const { year, offers } = await livePremiums(canton)
    return NextResponse.json(
      { year, source: "live", offers },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    )
  } catch (error) {
    console.log("[v0] franchise live premiums failed, using bundle:", (error as Error).message)
    try {
      const origin = new URL(request.url).origin
      const [offersRes, metaRes] = await Promise.all([
        fetch(`${origin}/data/priminfo-2026/premiums/${canton}.json`),
        fetch(`${origin}/data/priminfo-2026/meta.json`),
      ])
      if (!offersRes.ok) throw new Error(`Bundle ${offersRes.status}`)
      const offers = (await offersRes.json()) as Offer[]
      const meta = metaRes.ok ? ((await metaRes.json()) as { year?: number }) : {}
      return NextResponse.json(
        { year: meta.year ?? 2026, source: "bundle", offers },
        { headers: { "Cache-Control": "public, s-maxage=3600" } },
      )
    } catch (fallbackError) {
      return NextResponse.json(
        { error: "Prämiendaten sind derzeit nicht verfügbar.", detail: (fallbackError as Error).message },
        { status: 502 },
      )
    }
  }
}

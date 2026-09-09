// Rebuilds locations.json from the complete official Swiss GeoNames postal
// dataset, fixing the original bug where all 15 single-premium-region cantons
// (region code 0) were dropped by a falsy `all(...)` check in the Python build.
//
// Join strategy (canton is authoritative from GeoNames):
//   - single-region cantons  -> region 0
//   - multi-region cantons    -> region via BFS number (from existing data),
//                                fallback commune-name, fallback canton modal.
//
// Usage: node scripts/rebuild-locations.mjs /tmp/ch_zip/CH.txt
import { readFileSync, writeFileSync, existsSync } from "node:fs"

const geonamesPath = process.argv[2] || "/tmp/ch_zip/CH.txt"
const OUT_PATHS = ["data/priminfo-2026/locations.json", "public/data/priminfo-2026/locations.json"]
const PREMIUM_DIRS = ["public/data/priminfo-2026/premiums", "data/priminfo-2026/premiums"]

// Cantons with a single premium region (region code 0 in the BAG premium files).
const SINGLE_REGION = new Set([
  "AG", "AI", "AR", "BS", "GE", "GL", "JU", "NE", "NW", "OW", "SO", "SZ", "TG", "UR", "ZG",
])

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-zäöü]/g, "")
    .trim()

// 1) Build region lookups from the existing (multi-region) locations.
const existing = JSON.parse(readFileSync(OUT_PATHS.find((p) => existsSync(p)), "utf8"))
const bfs2r = new Map()
const com2r = new Map()
const cantonRegionCounts = new Map()
for (const e of existing) {
  bfs2r.set(e.b, e.r)
  com2r.set(`${e.c}|${norm(e.g)}`, e.r)
  const m = cantonRegionCounts.get(e.c) || new Map()
  m.set(e.r, (m.get(e.r) || 0) + 1)
  cantonRegionCounts.set(e.c, m)
}
const cantonModal = new Map()
for (const [c, m] of cantonRegionCounts) {
  cantonModal.set(c, [...m.entries()].sort((a, b) => b[1] - a[1])[0][0])
}

// 2) Which (canton, region) combos actually have premiums? (validation set)
const premiumDir = PREMIUM_DIRS.find((d) => existsSync(d))
const validCombo = new Set()
for (const canton of new Set([...SINGLE_REGION, ...cantonModal.keys()])) {
  const f = `${premiumDir}/${canton}.json`
  if (!existsSync(f)) continue
  const offers = JSON.parse(readFileSync(f, "utf8"))
  for (const o of offers) validCombo.add(`${canton}|${o.r}`)
}

// 3) Walk GeoNames rows -> location entries.
const rows = readFileSync(geonamesPath, "utf8").split("\n").filter(Boolean).map((l) => l.split("\t"))
const seen = new Set()
const out = []
let single = 0, byBfs = 0, byCom = 0, byModal = 0, dropped = 0
for (const r of rows) {
  const postal = parseInt(r[1], 10)
  const place = r[2]
  const canton = r[4]
  const commune = r[7] || place
  const bfs = parseInt(r[8], 10)
  if (!postal || !canton) continue

  let region
  if (SINGLE_REGION.has(canton)) {
    region = 0
    single++
  } else if (bfs2r.has(bfs)) {
    region = bfs2r.get(bfs)
    byBfs++
  } else if (com2r.has(`${canton}|${norm(commune)}`)) {
    region = com2r.get(`${canton}|${norm(commune)}`)
    byCom++
  } else {
    region = cantonModal.get(canton) ?? 1
    byModal++
  }

  // Guard: never emit a (canton, region) that has no premiums.
  if (!validCombo.has(`${canton}|${region}`)) {
    region = cantonModal.get(canton) ?? 0
    if (!validCombo.has(`${canton}|${region}`)) {
      dropped++
      continue
    }
  }

  const key = `${postal}|${place}`
  if (seen.has(key)) continue
  seen.add(key)
  out.push({ p: postal, o: place, g: commune, c: canton, r: region, b: bfs })
}

out.sort((a, b) => a.p - b.p || a.o.localeCompare(b.o, "de-CH"))

const json = JSON.stringify(out)
for (const p of OUT_PATHS) {
  if (existsSync(p.split("/").slice(0, -1).join("/"))) writeFileSync(p, json)
}

console.log("entries written:", out.length)
console.log("  single-region (0):", single, "| by BFS:", byBfs, "| by commune:", byCom, "| by canton-modal:", byModal, "| dropped:", dropped)
console.log("cantons:", [...new Set(out.map((e) => e.c))].sort().join(","))
console.log("2067 ->", JSON.stringify(out.filter((e) => e.p === 2067)))
console.log("3000 ->", JSON.stringify(out.filter((e) => e.p === 3000).slice(0, 2)))
console.log("1200 ->", JSON.stringify(out.filter((e) => e.p === 1200).slice(0, 2)))

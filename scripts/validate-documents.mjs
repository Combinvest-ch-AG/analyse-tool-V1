/**
 * Validierungs-Harness für die Dokumentenerstellung.
 *
 * Füllt jede Vorlage mit repräsentativen Testdaten + synthetischen Unterschriften
 * über dieselbe SSOT-Funktion (lib/documents/fill.ts), die auch die App nutzt,
 * und rastert jede Seite zu PNGs unter /tmp/agent-browser/val-*.png zur
 * visuellen Kontrolle der Feld- und Signaturplatzierung.
 *
 * Ausführen:  node scripts/validate-documents.mjs
 */
import fs from "node:fs/promises"
import path from "node:path"
import * as PDFLib from "pdf-lib"
import { pdf } from "pdf-to-img"
import { fillDocument } from "../lib/documents/fill.ts"

// @napi-rs/canvas ist eine dev-only Abhängigkeit; unter pnpm nicht immer top-level
// verlinkt, daher mit Fallback auf den Store-Pfad importieren.
let createCanvas
try {
  ;({ createCanvas } = await import("@napi-rs/canvas"))
} catch {
  ;({ createCanvas } = await import(
    "../node_modules/.pnpm/@napi-rs+canvas@1.0.9/node_modules/@napi-rs/canvas/index.js"
  ))
}

const TEMPLATE_DIR = path.resolve("public/documents/templates")
const OUT_DIR = "/tmp/agent-browser"
const PDF_DIR = "/tmp/doc-validation"

const DEFS = [
  { id: "protocol", file: "beratungsprotokoll-vorlage.pdf" },
  { id: "generalvollmacht", file: "vollmacht-vorsorgeinformationen.pdf" },
  { id: "vag", file: "vag-informationspflicht.pdf" },
  { id: "kk", file: "kuendigung-kvg-vvg.pdf" },
  { id: "private", file: "maklermandat-privat.pdf" },
  { id: "company", file: "maklermandat-firma.pdf" },
  { id: "triveso-private", file: "maklermandat-triveso-privat.pdf" },
  { id: "triveso-company", file: "maklermandat-triveso-firma.pdf" },
  { id: "pension", file: "vollmacht-vorsorgeinformationen.pdf" },
  { id: "pk", file: "pk-gelder-einholen.pdf" },
]

/** Zeichnet eine unterschrift-ähnliche Kurve als transparentes PNG. */
function signaturePng(label, hue) {
  const w = 320
  const h = 90
  const c = createCanvas(w, h)
  const ctx = c.getContext("2d")
  ctx.clearRect(0, 0, w, h)
  ctx.strokeStyle = hue
  ctx.lineWidth = 2.4
  ctx.lineJoin = "round"
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.moveTo(10, 60)
  for (let i = 0; i <= 300; i += 6) {
    const x = 10 + i
    const y = 55 + Math.sin(i / 18) * 22 - (i / 300) * 10 + (i % 24 < 12 ? 6 : -6)
    ctx.lineTo(x, y)
  }
  ctx.stroke()
  // zweite, kleinere Schleife für einen "Namenszug"
  ctx.beginPath()
  ctx.moveTo(20, 70)
  ctx.bezierCurveTo(60, 20, 120, 20, 160, 65)
  ctx.bezierCurveTo(200, 90, 250, 30, 300, 55)
  ctx.stroke()
  ctx.font = "12px sans-serif"
  ctx.fillStyle = hue
  ctx.fillText(label, 12, 84)
  return new Uint8Array(c.toBuffer("image/png"))
}

const form = {
  advisorName: "Markus Beispielberater",
  advisorEmail: "berater@combinvest.swiss",
  finma: "F01234567",
  advisorStreet: "Hausimollstrasse 3",
  advisorZipCity: "4622 Egerkingen",
  date: "09.09.2026",
  salutation: "Herr",
  birthdate: "14.03.1985",
  firstName: "Johannes",
  lastName: "Mustermann",
  company: "Mustermann Bau AG",
  email: "johannes.mustermann@example.com",
  phone: "079 123 45 67",
  street: "Musterstrasse 12",
  zip: "4600",
  city: "Olten",
  meetingType: "Beratungsgespräch",
  place: "Olten",
  decision: "",
}
const protocol = {
  topics: ["pension", "health", "investment", "property"],
  contractCompany: "Helsana",
  contractBranch: "Zusatzversicherung",
  cancellation: "forward",
  answers: {
    general: ["yes", "yes", "yes", "no", "yes", "yes", "yes", "no"],
    health: ["yes", "no", "yes"],
    investment: ["yes", "yes", "no"],
    property: ["yes"],
  },
  motives: {
    health: "Kunde wünscht besseren Spitalzusatz und ambulante Zusatzleistungen für die ganze Familie.",
    investment: "Langfristiger Vermögensaufbau über Säule 3a mit Wertschriftenlösung.",
    property: "Bestehende Hausratdeckung an neuen Wohnort und höheren Wert angepasst.",
  },
}
const pk = {
  ahvNumber: "756.1234.5678.97",
  previousPension: "PK der Bauwirtschaft",
  previousPensionAddress: "Bahnhofstrasse 1, 8000 Zürich",
  jobs: [
    { from: "2008", to: "2014", employer: "Bau AG Olten", role: "Polier" },
    { from: "2014", to: "2020", employer: "Hoch + Tief GmbH", role: "Bauführer" },
    { from: "2020", to: "2025", employer: "Mustermann Bau AG", role: "Geschäftsführer" },
    { from: "", to: "", employer: "", role: "" },
  ],
  benefits: ["yes", "no", "no", "yes"],
  attachments: [0, 1, 2, 3],
  death: {
    enabled: true,
    deathDate: "01.06.2026",
    survivorLast: "Mustermann",
    survivorFirst: "Erika",
    survivorBirth: "22.09.1987",
    relationship: "Ehefrau",
    survivorAddress: "Musterstrasse 12, 4600 Olten",
  },
}
const cancel = {
  kkCompany: "CSS Versicherung",
  kkPolicy: "POL-99887766",
  kkScope: ["KVG", "VVG"],
  kkDate: "31.12.2026",
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  await fs.mkdir(PDF_DIR, { recursive: true })
  const customerSig = signaturePng("Kunde", "#0b2a4a")
  const advisorSig = signaturePng("Berater", "#0b2a4a")

  for (const def of DEFS) {
    const templateBytes = await fs.readFile(path.join(TEMPLATE_DIR, def.file))
    let bytes
    try {
      bytes = await fillDocument({
        id: def.id,
        type: def.id === "company" || def.id === "triveso-company" ? "company" : "private",
        form,
        protocol,
        pk,
        cancel,
        templateBytes,
        customerSigPng: customerSig,
        advisorSigPng: advisorSig,
        PDFLib,
      })
    } catch (e) {
      console.log(`FAIL ${def.id}: ${e.message}`)
      continue
    }
    const pdfPath = path.join(PDF_DIR, `${def.id}.pdf`)
    await fs.writeFile(pdfPath, bytes)
    const doc = await pdf(pdfPath, { scale: 2 })
    let n = 0
    for await (const page of doc) {
      n += 1
      await fs.writeFile(path.join(OUT_DIR, `val-${def.id}-p${n}.png`), page)
    }
    console.log(`OK   ${def.id}: ${n} Seite(n) -> ${pdfPath}`)
  }
  console.log("Fertig. PNGs unter", OUT_DIR)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

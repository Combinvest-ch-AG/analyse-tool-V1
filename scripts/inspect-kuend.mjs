import { PDFDocument } from "pdf-lib"
import { readFile, writeFile } from "node:fs/promises"
import { pdf } from "pdf-to-img"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"

const src = "public/documents/templates/kuendigung-kvg-vvg.pdf"
const bytes = await readFile(src)

// 1. Form fields + page size
const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
const pages = doc.getPages()
console.log("PAGES:", pages.length, "SIZE:", pages[0].getWidth().toFixed(0), "x", pages[0].getHeight().toFixed(0))
const form = doc.getForm()
const fields = form.getFields()
console.log("FORM FIELDS:", fields.length)
for (const fld of fields) console.log("  -", fld.constructor.name, JSON.stringify(fld.getName()))

// 2. Text anchors (y from bottom, pdf coords)
const H = pages[0].getHeight()
const task = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise
for (let p = 1; p <= task.numPages; p++) {
  const page = await task.getPage(p)
  const tc = await page.getTextContent()
  console.log(`\n=== ANCHORS Seite ${p} ===`)
  for (const it of tc.items) {
    const s = (it.str || "").trim()
    if (!s) continue
    const x = it.transform[4]
    const y = it.transform[5]
    console.log(`  x=${x.toFixed(0)} y=${y.toFixed(0)}  ${JSON.stringify(s.slice(0, 42))}`)
  }
}

// 3. Render blank template
const r = await pdf(bytes, { scale: 2 })
let i = 0
for await (const pg of r) { await writeFile(`/tmp/agent-browser/kuend-blank-p${i}.png`, pg); i++ }
console.log("\nrendered", i, "page(s)")

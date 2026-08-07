// Dev-Werkzeug: rendert PDF-Vorlagen zu PNG + dumpt Formularfeld-Positionen.
// Nur zur visuellen Ausrichtung der Dokumenterstellung; nicht Teil der App.
import { PDFDocument } from "pdf-lib"
import { pdf } from "pdf-to-img"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"

const TEMPLATE_DIR = "public/documents/templates"
const OUT_DIR = "/tmp/agent-browser"

const FILES = {
  protocol: "beratungsprotokoll-vorlage.pdf",
  pk: "pk-gelder-einholen-vorlage.pdf",
  vag: "vag-informationspflicht-vorlage.pdf",
  private: "mandat-combinvest-privat-vorlage.pdf",
  company: "mandat-combinvest-firma-vorlage.pdf",
  "triveso-private": "mandat-triveso-privat-vorlage.pdf",
  "triveso-company": "mandat-triveso-firma-vorlage.pdf",
  pension: "vollmacht-vorsorgeinformationen-vorlage.pdf",
}

async function dumpFields(id, path) {
  const doc = await PDFDocument.load(await readFile(path), { ignoreEncryption: true })
  const form = doc.getForm()
  const fields = form.getFields()
  if (!fields.length) {
    console.log(`\n[${id}] KEINE Formularfelder (${doc.getPageCount()} Seiten) -> koordinatenbasiert`)
    return
  }
  console.log(`\n[${id}] ${fields.length} Formularfelder:`)
  for (const field of fields) {
    const name = field.getName()
    const widgets = field.acroField.getWidgets()
    for (const w of widgets) {
      const r = w.getRectangle()
      const pageRef = w.P()
      const pageIndex = doc.getPages().findIndex((p) => p.ref === pageRef)
      console.log(
        `  "${name}"  seite=${pageIndex}  x=${r.x.toFixed(0)} y=${r.y.toFixed(0)} w=${r.width.toFixed(0)} h=${r.height.toFixed(0)}`,
      )
    }
  }
}

async function render(id, path, scale = 2) {
  const document = await pdf(await readFile(path), { scale })
  let i = 0
  for await (const page of document) {
    const out = join(OUT_DIR, `tpl-${id}-p${i}.png`)
    await writeFile(out, page)
    console.log(`  rendered ${out}`)
    i++
  }
}

await mkdir(OUT_DIR, { recursive: true })
const only = process.argv[2]
for (const [id, file] of Object.entries(FILES)) {
  if (only && id !== only) continue
  const path = join(TEMPLATE_DIR, file)
  await dumpFields(id, path)
  await render(id, path)
}
console.log("\nDone.")

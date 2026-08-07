import { PDFDocument } from "pdf-lib"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

const DIR = "public/documents/templates"
const file = process.argv[2]
const doc = await PDFDocument.load(await readFile(join(DIR, file)), { ignoreEncryption: true })
const form = doc.getForm()
const fields = form.getFields()
console.log(`${file}: ${fields.length} Felder`)
for (const f of fields) {
  const type = f.constructor.name
  const name = f.getName()
  // Position des ersten Widgets ermitteln
  let pos = ""
  try {
    const w = f.acroField.getWidgets()[0]
    const r = w.getRectangle()
    pos = ` @ x=${Math.round(r.x)} y=${Math.round(r.y)} w=${Math.round(r.width)} h=${Math.round(r.height)} (S.${doc.getPages().findIndex((p) => p.ref === w.P()) })`
  } catch {}
  console.log(`  [${type}] "${name}"${pos}`)
}

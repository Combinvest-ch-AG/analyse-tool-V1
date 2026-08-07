import { readFileSync, readdirSync } from "node:fs"
import { PDFDocument } from "pdf-lib"

const dir = "public/documents/templates"
const files = readdirSync(dir).filter((f) => f.endsWith(".pdf"))

for (const file of files) {
  const bytes = readFileSync(`${dir}/${file}`)
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const pages = pdf.getPages()
  console.log("\n========================================")
  console.log(`FILE: ${file}`)
  console.log(`pages: ${pages.length}`)
  pages.forEach((p, i) => {
    const { width, height } = p.getSize()
    console.log(`  page ${i}: ${Math.round(width)} x ${Math.round(height)}`)
  })
  let fields = []
  try {
    fields = pdf.getForm().getFields()
  } catch (e) {
    console.log("  (no form / error reading form)", e.message)
  }
  console.log(`  form fields: ${fields.length}`)
  for (const f of fields) {
    const name = f.getName()
    const type = f.constructor.name
    // Try to find widget position
    let pos = ""
    try {
      const widgets = f.acroField.getWidgets()
      const rects = widgets.map((w) => {
        const r = w.getRectangle()
        // find page index
        let pageIdx = -1
        const ref = w.P?.()
        pages.forEach((pg, idx) => {
          if (pg.ref === ref) pageIdx = idx
        })
        return `p${pageIdx}(x${Math.round(r.x)},y${Math.round(r.y)},w${Math.round(r.width)},h${Math.round(r.height)})`
      })
      pos = rects.join(" ")
    } catch {}
    console.log(`    [${type}] "${name}" ${pos}`)
  }
}

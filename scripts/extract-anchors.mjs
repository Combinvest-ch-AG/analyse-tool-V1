// Dev-Werkzeug: extrahiert Textanker (Label -> x/y in PDF-Punkten, Ursprung
// unten links) aus den koordinatenbasierten Vorlagen. Damit lassen sich die
// Fuellkoordinaten exakt relativ zu den gedruckten Labels bestimmen.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

const DIR = "public/documents/templates"
const files = {
  protocol: "beratungsprotokoll-vorlage.pdf",
  pk: "pk-gelder-einholen.pdf",
  vag: "vag-informationspflicht.pdf",
}
const only = process.argv[2]
const filter = process.argv[3]?.toLowerCase()

for (const [id, file] of Object.entries(files)) {
  if (only && id !== only) continue
  const data = new Uint8Array(await readFile(join(DIR, file)))
  const doc = await getDocument({ data, useSystemFonts: true }).promise
  console.log(`\n===== ${id} (${doc.numPages} Seiten) =====`)
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const vp = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()
    console.log(`\n--- Seite ${p - 1} (H=${vp.height.toFixed(0)}) ---`)
    for (const item of content.items) {
      const str = item.str.trim()
      if (!str) continue
      if (filter && !str.toLowerCase().includes(filter)) continue
      // transform: [a,b,c,d,e,f] -> e=x, f=y (top-left origin in pdfjs)
      const x = item.transform[4]
      const yTop = item.transform[5]
      const yPdf = yTop // pdfjs uses bottom-left already for text transform f
      console.log(`  x=${x.toFixed(0)} y=${yPdf.toFixed(0)}  "${str.slice(0, 48)}"`)
    }
  }
}

import { PDFDocument, PDFName, PDFArray, PDFDict } from "pdf-lib"
import { readFile } from "node:fs/promises"

const bytes = await readFile("public/documents/templates/kuendigung-kvg-vvg.pdf")
const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
const page = pdf.getPages()[0]
const annots = page.node.Annots()
if (!annots) { console.log("NO annotations") }
else {
  const arr = annots.asArray ? annots.asArray() : []
  console.log("annotation count:", arr.length)
  arr.forEach((ref, i) => {
    const a = pdf.context.lookup(ref)
    const sub = a.get(PDFName.of("Subtype"))
    const rect = a.get(PDFName.of("Rect"))
    console.log(i, "subtype:", sub?.toString(), "rect:", rect?.toString())
  })
}
// Also check for page-level transparency group / XObjects
const res = page.node.Resources()
const xobj = res?.get(PDFName.of("XObject"))
console.log("has XObject resources:", !!xobj)

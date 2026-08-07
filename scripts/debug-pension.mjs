import { PDFDocument, StandardFonts, PDFName, PDFBool } from "pdf-lib"
import { readFile, writeFile } from "node:fs/promises"

const src = "public/documents/templates/vollmacht-vorsorgeinformationen.pdf"
const doc = await PDFDocument.load(await readFile(src), { ignoreEncryption: true })
const form = doc.getForm()
const font = await doc.embedFont(StandardFonts.Helvetica)

const field = form.getTextField("Text Box 1")
try { console.log("field DA:", JSON.stringify(field.acroField.getDefaultAppearance())) } catch (e) { console.log("field DA err:", e.message) }
try { console.log("AcroForm DA:", JSON.stringify(form.acroField.getDefaultAppearance())) } catch (e) { console.log("acro DA err:", e.message) }

field.setText("PROBE Mustermann")
field.setFontSize(10)
console.log("value after setText:", field.getText())

form.updateFieldAppearances(font)

const widget = field.acroField.getWidgets()[0]
const ap = widget.getAppearances()
console.log("has normal AP after update:", !!ap?.normal)

// Fallback: NeedAppearances
form.acroField.dict.set(PDFName.of("NeedAppearances"), PDFBool.True)

await writeFile("/tmp/agent-browser/debug-pension.pdf", await doc.save())
console.log("saved debug pdf")

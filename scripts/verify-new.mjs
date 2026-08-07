import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { pdf as toImg } from "pdf-to-img"
import { readFile, writeFile } from "node:fs/promises"

const T = "public/documents/templates"
const f = {
  firstName: "Maximilian", lastName: "Mustermann", company: "",
  street: "Bahnhofstrasse 42", zip: "8001", city: "Zürich", birthdate: "15.03.1985",
  phone: "079 123 45 67", email: "max@example.ch", advisorName: "Anna Beraterin",
  place: "Zürich", date: "07.08.2026",
}
const full = f.firstName + " " + f.lastName
const dateText = (f.place || f.city) + ", " + f.date

const render = async (name, bytes) => {
  const doc = await toImg(bytes, { scale: 2 })
  let i = 0
  for await (const p of doc) { await writeFile(`/tmp/agent-browser/verify-${name}-p${i}.png`, p); i++ }
  console.log("rendered", name, i)
}

// ---- KK (Krankenkassen-Kündigung), coordinate-based ----
{
  const kkScope = ["KVG", "VVG"]
  const kkCompany = "CSS"
  const kkDate = "31.12.2026"
  const bytes = await readFile(`${T}/kuendigung-kvg-vvg.pdf`)
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const ink = rgb(0.07, 0.12, 0.2)
  const page = pdf.getPages()[0]
  const text = (x, y, v, size = 9) => { if (v) page.drawText(String(v), { x, y, size, font, color: ink }) }
  text(60, 780, full); text(60, 761, f.street); text(60, 742, f.zip + " " + f.city); text(60, 723, f.phone)
  text(357, 629, kkCompany)
  text(60, 540, dateText)
  text(60, 330, full); text(246, 330, f.birthdate)
  if (kkScope.includes("KVG")) text(476, 343, kkDate, 8)
  if (kkScope.includes("VVG")) text(476, 329, kkDate, 8)
  await render("kk", await pdf.save())
}

// ---- Generalvollmacht (reuses Vorsorge template, form fields) ----
{
  const bytes = await readFile(`${T}/vollmacht-vorsorgeinformationen.pdf`)
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const set = (n, v) => { try { const fld = pdf.getForm().getTextField(n); fld.setText(v || ""); fld.setFontSize(10) } catch {} }
  set("Text Box 1", full); set("Text Box 1_2", f.street); set("Text Box 1_3", f.zip + " " + f.city)
  set("Text Box 1_4", f.birthdate); set("Text Box 1_5", f.advisorName)
  set("Text Box 1_6", f.place + ", " + f.date); set("Text Box 1_7", f.place + ", " + f.date)
  try { pdf.getForm().updateFieldAppearances(font) } catch {}
  await render("generalvollmacht", await pdf.save())
}

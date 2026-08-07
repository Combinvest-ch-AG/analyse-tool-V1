// Dev-Werkzeug: fuellt die Vorlagen mit Musterdaten (spiegelt createPdf) und
// rendert die Seiten zu PNG, um die Platzierung visuell zu pruefen.
// Signaturen werden als sichtbares Rechteck + Label simuliert.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { pdf } from "pdf-to-img"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"

const DIR = "public/documents/templates"
const OUT = "/tmp/agent-browser"
const RED = rgb(0.85, 0.1, 0.1)
const INK = rgb(0.07, 0.12, 0.2)

// Musterdaten
const f = {
  salutation: "Herr", birthdate: "15.03.1985", firstName: "Maximilian", lastName: "Mustermann",
  street: "Bahnhofstrasse 42", zip: "8001", city: "Zürich", phone: "079 123 45 67",
  email: "max.mustermann@example.ch", place: "Zürich", date: "07.08.2026",
  advisorName: "Anna Beraterin", advisorStreet: "Seestrasse 10", advisorZipCity: "8002 Zürich",
  finma: "12345", company: "Muster AG",
}
const address = `${f.street}, ${f.zip} ${f.city}`
const dateText = `${f.place}, ${f.date}`

function markBox(page, x, y, label) {
  page.drawRectangle({ x, y, width: 120, height: 26, borderColor: RED, borderWidth: 1, color: rgb(1, 0.9, 0.9), opacity: 0.4 })
  page.drawText(label, { x: x + 3, y: y + 9, size: 6, color: RED })
}

async function fillProtocol(pdfDoc, font) {
  const pages = pdfDoc.getPages()
  const [first, second, third] = pages
  const last = pages[pages.length - 1]
  const T = (pg, v, x, y, size = 9) => v && pg.drawText(String(v), { x, y, size, font, color: INK })
  T(first, f.salutation, 171, 640); T(first, f.birthdate, 369, 640)
  T(first, f.firstName, 171, 619); T(first, f.lastName, 369, 619)
  T(first, f.street, 171, 596); T(first, `${f.zip} ${f.city}`, 369, 596)
  T(first, f.phone, 171, 573); T(first, f.email, 369, 573)
  T(first, "X", 92, 489, 10) // Datenerhebung
  ;[374, 355, 335, 316].forEach((y) => T(first, "X", 92, y, 10)) // alle Themen
  T(first, "Beispiel Versicherung AG", 93, 230); T(first, "Krankenversicherung", 302, 230)
  const mark = (pg, ys) => ys.forEach((y, i) => T(pg, "X", i % 2 ? 116 : 95, y, 9))
  mark(second, [660, 637, 613, 589, 565, 534, 504, 479])
  mark(second, [369, 328, 294])
  mark(third, [656, 621, 587]); mark(third, [298])
  T(last, "X", 116, 656); T(last, dateText, 86, 250, 8); T(last, dateText, 86, 187, 8)
  T(last, `${f.advisorName} | FINMA ${f.finma}`, 300, 190, 7)
  markBox(last, 300, 247, "Kunde Unterschrift"); markBox(last, 440, 184, "Berater")
}

async function fillPk(pdfDoc, font) {
  const pages = pdfDoc.getPages()
  const first = pages[0]
  const last = pages[pages.length - 1]
  const T = (pg, v, x, y, size = 9) => v && pg.drawText(String(v), { x, y, size, font, color: INK })
  T(first, f.lastName, 118, 625); T(first, f.firstName, 132, 602)
  T(first, f.birthdate, 155, 579); T(first, "756.1234.5678.90", 298, 579)
  T(first, address, 163, 557); T(first, f.phone, 163, 466)
  const jobY = [135, 110, 85, 60]
  jobY.forEach((y) => { T(first, "01.2010", 82, y, 7); T(first, "12.2020", 149, y, 7); T(first, "Muster AG", 212, y, 7); T(first, "Kadermitarbeiter", 358, y, 7) })
  T(last, "Vorherige PK", 149, 725); T(last, "PK-Strasse 1, 8000 Zürich", 149, 703)
  ;[586, 575, 564, 552].forEach((y, i) => T(last, "X", i % 2 ? 337 : 303, y, 9))
  T(last, dateText, 150, 309, 8); markBox(last, 285, 290, "Kunde Unterschrift")
  ;[118, 107, 95].forEach((y) => T(last, "X", 86, y, 9))
}

async function fillVag(pdfDoc, font) {
  const pages = pdfDoc.getPages()
  const vagFirst = pages[0]
  const vag = pages[pages.length - 1]
  const T = (pg, v, x, y, size = 9) => v && pg.drawText(String(v), { x, y, size, font, color: INK })
  T(vagFirst, f.advisorName, 364, 703); T(vagFirst, f.advisorStreet, 364, 681)
  T(vagFirst, f.advisorZipCity, 364, 659); T(vagFirst, f.finma, 364, 637)
  T(vag, dateText, 72, 590, 8); T(vag, dateText, 324, 590, 8)
  markBox(vag, 72, 480, "Berater"); markBox(vag, 324, 480, "Kunde")
}

const full = `${f.firstName} ${f.lastName}`
const companyFull = `${f.company} / ${f.firstName} ${f.lastName}`
const setField = (doc, name, value, size = 10) => {
  try {
    const field = doc.getForm().getTextField(name)
    field.setText(value || "")
    field.setFontSize(size)
  } catch { /* not present */ }
}
const finalize = (doc, font) => { try { doc.getForm().updateFieldAppearances(font) } catch {} }

async function fillCombinvest(doc, font, isCompany) {
  const name = isCompany ? companyFull : full
  setField(doc, "Name", name)
  setField(doc, "Strasse  Nr", f.street)
  setField(doc, "PLZ  Ort", `${f.zip} ${f.city}`)
  setField(doc, "Telefonnummer", f.phone)
  setField(doc, "Email", f.email)
  setField(doc, "Text1", `${f.place}, ${f.date}`)
  setField(doc, "Text2", `${f.place}, ${f.date}`)
  finalize(doc, font)
  const p = doc.getPages()[0]
  p.drawText(f.salutation, { x: 140, y: 646, size: 9, font, color: INK })
  markBox(p, 315, 124, "Kunde"); markBox(p, 315, 78, "Berater")
}

async function fillTrivesoPrivate(doc, font) {
  const fields = {
    "Text-A0_PYS-9-8": f.salutation, "Text-QNCXd6HnhQ": f.birthdate,
    "Text-0N-N1EAc1l": f.firstName, "Text-j18-8a9oz5": f.lastName,
    "Text-3VQSSwokG-": f.street, "Text-TfylkX6tRv": `${f.zip} ${f.city}`,
    "Text-3SUUcZKDzd": f.phone, "Text-Qpw5oP2k-c": f.email,
    "Text-8tapIkXUNW": `${f.place}, ${f.date}`, "Text-qQJbfRMLiG": `${f.place}, ${f.date}`,
  }
  Object.entries(fields).forEach(([k, v]) => setField(doc, k, v))
  finalize(doc, font)
  const p = doc.getPages()[0]
  markBox(p, 300, 118, "Kunde"); markBox(p, 300, 73, "Berater")
}

async function fillTrivesoCompany(doc, font) {
  const fields = {
    "Text-3uqA1Rn3Ye": f.company || full, "Text-yagTWQstLB": full,
    "Text-kL5RHfqaAT": `${f.zip} ${f.city}`, "Text-IqxFz4tNkR": f.street,
    "Text-qqJkVb3-Pl": `${f.phone}  ${f.email}`,
    "Text-ugfUrNU5WH": `${f.place}, ${f.date}`, "Text-5Z-o08otbZ": `${f.place}, ${f.date}`,
  }
  Object.entries(fields).forEach(([k, v]) => setField(doc, k, v))
  finalize(doc, font)
  const p = doc.getPages()[0]
  markBox(p, 300, 118, "Kunde"); markBox(p, 300, 73, "Berater")
}

async function fillPension(doc, font) {
  const fields = {
    "Text Box 1": full, "Text Box 1_2": f.street, "Text Box 1_3": `${f.zip} ${f.city}`,
    "Text Box 1_4": f.birthdate, "Text Box 1_5": f.advisorName,
    "Text Box 1_6": `${f.place}, ${f.date}`, "Text Box 1_7": `${f.place}, ${f.date}`,
  }
  Object.entries(fields).forEach(([k, v]) => setField(doc, k, v))
  finalize(doc, font)
  const p = doc.getPages()[0]
  markBox(p, 72, 136, "Kunde"); markBox(p, 300, 136, "Berater")
}

const FILLERS = {
  "beratungsprotokoll-vorlage.pdf": fillProtocol,
  "pk-gelder-einholen.pdf": fillPk,
  "vag-informationspflicht.pdf": fillVag,
  "maklermandat-privat.pdf": (d, ft) => fillCombinvest(d, ft, false),
  "maklermandat-firma.pdf": (d, ft) => fillCombinvest(d, ft, true),
  "maklermandat-triveso-privat.pdf": fillTrivesoPrivate,
  "maklermandat-triveso-firma.pdf": fillTrivesoCompany,
  "vollmacht-vorsorgeinformationen.pdf": fillPension,
}

await mkdir(OUT, { recursive: true })
const only = process.argv[2]
for (const [file, filler] of Object.entries(FILLERS)) {
  const id = file.replace(/-vorlage\.pdf$|\.pdf$/, "")
  if (only && !file.includes(only)) continue
  const doc = await PDFDocument.load(await readFile(join(DIR, file)), { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.Helvetica)
  await filler(doc, font)
  const out = join(OUT, `fill-${id}.pdf`)
  await writeFile(out, await doc.save())
  const rendered = await pdf(await readFile(out), { scale: 2 })
  let i = 0
  for await (const page of rendered) { await writeFile(join(OUT, `fill-${id}-p${i}.png`), page); i++ }
  console.log(`filled+rendered ${id} (${i} Seiten)`)
}
console.log("Done.")

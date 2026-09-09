/**
 * SSOT für die Dokumentenerstellung.
 *
 * Diese Datei ist die EINZIGE Quelle für:
 *  - die Feld-/Textkoordinaten jeder Vorlage
 *  - die Signatur-Ankerpunkte (Kunde + Berater)
 *
 * Sie wird verwendet von:
 *  - components/portal/documents/document-builder.tsx  (Erstellung im Browser)
 *  - app/actions/signatures.ts                          (Remote-Signatur, Server)
 *  - scripts/validate-documents.mjs                     (visuelle Validierung)
 *
 * WICHTIG: keine Laufzeit-Imports. `pdf-lib` wird als Parameter übergeben, damit
 * dieselbe reine Funktion im Browser (dynamischer Import), im Server-Action-Kontext
 * und in einem plain-Node-Validierungsskript (Type-Stripping) läuft.
 *
 * Koordinatensystem: pdf-lib, Ursprung unten links, Einheit PDF-Punkte.
 */

export type DocForm = {
  advisorName: string
  advisorEmail: string
  finma: string
  advisorStreet: string
  advisorZipCity: string
  date: string
  salutation: string
  birthdate: string
  firstName: string
  lastName: string
  company: string
  email: string
  phone: string
  street: string
  zip: string
  city: string
  meetingType: string
  place: string
  decision: string
}

export type Protocol = {
  topics: string[]
  contractCompany: string
  contractBranch: string
  cancellation: string
  answers: Record<string, string[]>
  motives: Record<string, string>
}

export type PkDeath = {
  enabled: boolean
  deathDate: string
  survivorLast: string
  survivorFirst: string
  survivorBirth: string
  relationship: string
  survivorAddress: string
}

export type Pk = {
  ahvNumber: string
  previousPension: string
  previousPensionAddress: string
  jobs: { from: string; to: string; employer: string; role: string }[]
  benefits: string[]
  attachments: number[]
  death: PkDeath
}

export type Cancellation = {
  kkCompany: string
  kkPolicy: string
  kkScope: string[]
  kkDate: string
}

export type SignAnchor = { page: "first" | "last"; x: number; y: number; w: number; h: number }

export const SIGNATURE_BUCKET = "analysis-documents"

/** Kunden-Signaturanker pro Dokument. */
export const CUSTOMER_SIGN_ANCHORS: Record<string, SignAnchor> = {
  private: { page: "first", x: 320, y: 128, w: 190, h: 26 },
  company: { page: "first", x: 320, y: 128, w: 190, h: 26 },
  "triveso-private": { page: "first", x: 305, y: 120, w: 195, h: 26 },
  "triveso-company": { page: "first", x: 305, y: 120, w: 195, h: 26 },
  pension: { page: "first", x: 78, y: 138, w: 190, h: 28 },
  generalvollmacht: { page: "first", x: 78, y: 138, w: 190, h: 28 },
  kk: { page: "first", x: 340, y: 326, w: 86, h: 20 },
  vag: { page: "last", x: 330, y: 470, w: 175, h: 34 },
  protocol: { page: "last", x: 305, y: 250, w: 190, h: 28 },
  pk: { page: "last", x: 290, y: 292, w: 165, h: 24 },
}

/** Berater-Signaturanker (nur Dokumente mit Beraterunterschrift). */
export const ADVISOR_SIGN_ANCHORS: Record<string, SignAnchor> = {
  private: { page: "first", x: 320, y: 82, w: 190, h: 26 },
  company: { page: "first", x: 320, y: 82, w: 190, h: 26 },
  "triveso-private": { page: "first", x: 305, y: 75, w: 195, h: 26 },
  "triveso-company": { page: "first", x: 305, y: 75, w: 195, h: 26 },
  pension: { page: "first", x: 305, y: 138, w: 190, h: 28 },
  generalvollmacht: { page: "first", x: 305, y: 138, w: 190, h: 28 },
  vag: { page: "last", x: 78, y: 470, w: 175, h: 34 },
  protocol: { page: "last", x: 400, y: 186, w: 105, h: 26 },
}

export type FillInput = {
  id: string
  type: "private" | "company"
  form: DocForm
  protocol: Protocol
  pk: Pk
  cancel: Cancellation
  templateBytes: ArrayBuffer | Uint8Array
  customerSigPng?: Uint8Array | null
  advisorSigPng?: Uint8Array | null
  PDFLib: typeof import("pdf-lib")
}

/**
 * Füllt eine Vorlage mit den Kundendaten und zeichnet – sofern übergeben – die
 * Unterschriften an den definierten Ankerpunkten ein. Reine Funktion.
 */
export async function fillDocument(input: FillInput): Promise<Uint8Array> {
  const { id, type, form: f, protocol, pk, cancel, templateBytes, customerSigPng, advisorSigPng, PDFLib } = input
  const { PDFDocument, StandardFonts, rgb, PDFName, PDFDict, PDFRawStream } = PDFLib

  const pdf = await PDFDocument.load(templateBytes as ArrayBuffer, { ignoreEncryption: true })
  const full = (f.company && type === "company" ? f.company + " / " : "") + f.firstName + " " + f.lastName
  const address = f.street + ", " + f.zip + " " + f.city
  const dateText = (f.place || f.city) + ", " + f.date

  const safeField = (name: string, value: string, size = 10) => {
    try {
      const field = pdf.getForm().getTextField(name)
      field.setText(value || "")
      field.setFontSize(size)
    } catch {
      /* Feld in dieser Vorlage nicht vorhanden */
    }
  }

  if (id === "private" || id === "company") {
    safeField("Name", full)
    safeField("Strasse  Nr", f.street)
    safeField("PLZ  Ort", f.zip + " " + f.city)
    safeField("Telefonnummer", f.phone)
    safeField("Email", f.email)
    safeField("Text1", f.place + ", " + f.date)
    safeField("Text2", f.place + ", " + f.date)
  }
  // Hinweis: Die Vorsorgevollmacht-Vorlage hat verwaiste Formularfeld-Widgets
  // (nicht mit einer Seite verknüpft) – ihre Werte werden von Viewern nie
  // gerendert. Diese Vorlage wird daher weiter unten direkt bezeichnet.
  if (id === "triveso-private") {
    const fields: Record<string, string> = {
      "Text-A0_PYS-9-8": f.salutation,
      "Text-QNCXd6HnhQ": f.birthdate,
      "Text-0N-N1EAc1l": f.firstName,
      "Text-j18-8a9oz5": f.lastName,
      "Text-3VQSSwokG-": f.street,
      "Text-TfylkX6tRv": f.zip + " " + f.city,
      "Text-3SUUcZKDzd": f.phone,
      "Text-Qpw5oP2k-c": f.email,
      "Text-8tapIkXUNW": (f.place || f.city) + ", " + f.date,
      "Text-qQJbfRMLiG": (f.place || f.city) + ", " + f.date,
    }
    Object.entries(fields).forEach(([k, v]) => safeField(k, v))
  }
  if (id === "triveso-company") {
    const fields: Record<string, string> = {
      "Text-3uqA1Rn3Ye": f.company || full,
      "Text-yagTWQstLB": full,
      "Text-kL5RHfqaAT": f.zip + " " + f.city,
      "Text-IqxFz4tNkR": f.street,
      "Text-qqJkVb3-Pl": f.phone + "  " + f.email,
      "Text-ugfUrNU5WH": (f.place || f.city) + ", " + f.date,
      "Text-5Z-o08otbZ": (f.place || f.city) + ", " + f.date,
    }
    Object.entries(fields).forEach(([k, v]) => safeField(k, v))
  }

  const font = await pdf.embedFont(StandardFonts.Helvetica)
  try {
    pdf.getForm().updateFieldAppearances(font)
  } catch {
    /* ignore */
  }

  const ink = rgb(0.07, 0.12, 0.2)
  const pages = pdf.getPages()

  /** Entfernt alle Annotationen einer Seite (verwaiste Widgets / Alt-Overlays). */
  const stripAnnots = (page: (typeof pages)[number]) => {
    page.node.set(PDFName.of("Annots"), pdf.context.obj([]))
  }

  /**
   * Leert die Form-XObjects (Overlays) einer Seite. Manche gescannten Vorlagen
   * legen ausgefüllte Alt-Daten (Namen, Unterschriften) als Form-XObject-Overlay
   * über das leere Formular. Das Leeren des Streams gibt das unberührte
   * Blankoformular frei und entfernt sämtliche Fremd-Personendaten (Datenschutz).
   */
  const clearOverlayForms = (page: (typeof pages)[number]) => {
    const res = page.node.Resources()
    const xobjects = res?.lookup(PDFName.of("XObject"), PDFDict)
    if (!xobjects) return
    for (const [, ref] of xobjects.entries()) {
      const stream = pdf.context.lookup(ref)
      const dict = (stream as { dict?: unknown })?.dict
      const subtype = (dict as { get?: (n: unknown) => unknown })?.get?.(PDFName.of("Subtype"))
      if (subtype?.toString() === "/Form" && dict) {
        pdf.context.assign(ref, PDFRawStream.of(dict as never, new Uint8Array([])))
      }
    }
  }

  type Page = ReturnType<typeof pdf.getPages>[number]
  type Img = Awaited<ReturnType<typeof pdf.embedPng>>

  const customerImage: Img | null = customerSigPng ? await pdf.embedPng(customerSigPng) : null
  const advisorImage: Img | null = advisorSigPng ? await pdf.embedPng(advisorSigPng) : null

  const text = (page: Page, value: string, x: number, y: number, size = 9) => {
    if (value) page.drawText(String(value).slice(0, 90), { x, y, size, font, color: ink })
  }
  const wrap = (
    page: Page,
    value: string,
    x: number,
    y: number,
    width: number,
    size: number,
    lineHeight: number,
    maxLines = 8,
  ) => {
    const words = String(value || "").split(/\s+/)
    let line = ""
    const lines: string[] = []
    for (const w of words) {
      const test = (line + " " + w).trim()
      if (font.widthOfTextAtSize(test, size) > width && line) {
        lines.push(line)
        line = w
      } else line = test
    }
    if (line) lines.push(line)
    lines.slice(0, maxLines).forEach((l, idx) => text(page, l, x, y - idx * lineHeight, size))
  }
  /** Unterschrift proportional in die Anker-Box einpassen (kein Verzerren). */
  const drawSig = (image: Img | null, anchor: SignAnchor | undefined, pageOverride?: Page) => {
    if (!image || !anchor) return
    const page = pageOverride ?? (anchor.page === "last" ? pages[pages.length - 1] : pages[0])
    const scale = Math.min(anchor.w / image.width, anchor.h / image.height)
    const w = image.width * scale
    const h = image.height * scale
    const x = anchor.x + (anchor.w - w) / 2
    const y = anchor.y + (anchor.h - h) / 2
    page.drawImage(image, { x, y, width: w, height: h })
  }
  const signCustomer = () => drawSig(customerImage, CUSTOMER_SIGN_ANCHORS[id])
  const signAdvisor = () => drawSig(advisorImage, ADVISOR_SIGN_ANCHORS[id])

  if (id === "private" || id === "company") {
    // Anrede (Herr/Frau) deutlich ÜBER die Linie setzen, nicht auf die Linie.
    text(pages[0], f.salutation, 140, 656, 9)
    signCustomer()
    signAdvisor()
  }
  if (id === "triveso-private" || id === "triveso-company") {
    signCustomer()
    signAdvisor()
  }
  if (id === "pension" || id === "generalvollmacht") {
    // Verwaiste Feld-Widgets entfernen (leere graue Kästen) und direkt bezeichnen.
    const p = pages[0]
    stripAnnots(p)
    text(p, full, 82, 677, 10)
    text(p, f.birthdate, 309, 677, 10)
    text(p, f.street, 82, 634, 10)
    text(p, f.zip + " " + f.city, 309, 634, 10)
    text(p, f.advisorName, 185, 492, 10)
    text(p, dateText, 82, 203, 10)
    text(p, dateText, 307, 203, 10)
    signCustomer()
    signAdvisor()
  }
  if (id === "kk") {
    const kkPage = pages[0]
    // Die Vorlage enthält eingebrannte Alt-Daten einer früheren Kundin (Name
    // "Linda Suska" + zwei Unterschriften). Sie stecken in einem Form-XObject-
    // Overlay und einer Stamp-Annotation über dem leeren Formular. Wir entfernen
    // beide, wodurch das unberührte Blankoformular frei wird – keine fremden
    // Personendaten mehr im Dokument (Datenschutz), ohne Übermalen.
    stripAnnots(kkPage)
    clearOverlayForms(kkPage)
    // Absenderblock (versicherte Person)
    text(kkPage, full, 105, 778, 9)
    text(kkPage, f.street, 105, 752, 9)
    text(kkPage, f.zip + " " + f.city, 105, 727, 9)
    text(kkPage, f.phone, 105, 702, 9)
    // Empfänger (Einschreiben)
    text(kkPage, cancel.kkCompany, 365, 622, 9)
    // Datum des Poststempels
    text(kkPage, dateText, 105, 540, 9)
    // Personentabelle Zeile 1
    text(kkPage, full, 105, 327, 9)
    text(kkPage, f.birthdate, 250, 327, 9)
    drawSig(customerImage, CUSTOMER_SIGN_ANCHORS.kk, kkPage)
    // Gekündigter Bereich ankreuzen (X in ☐) + Termin eintragen. KVG obere,
    // VVG untere Linie der ersten Personenzeile.
    if (cancel.kkScope.includes("KVG")) {
      text(kkPage, "X", 444, 336, 8)
      text(kkPage, cancel.kkDate, 468, 335, 8)
    }
    if (cancel.kkScope.includes("VVG")) {
      text(kkPage, "X", 444, 323, 8)
      text(kkPage, cancel.kkDate, 468, 321, 8)
    }
  }
  if (id === "vag") {
    const vagFirst = pages[0]
    const vag = pages[pages.length - 1]
    text(vagFirst, f.advisorName, 364, 703, 9)
    text(vagFirst, f.advisorStreet, 364, 681, 9)
    text(vagFirst, f.advisorZipCity, 364, 659, 9)
    text(vagFirst, f.finma, 364, 637, 9)
    text(vag, dateText, 72, 590, 8)
    text(vag, dateText, 324, 590, 8)
    signAdvisor()
    signCustomer()
  }
  if (id === "protocol") {
    const first = pages[0]
    const second = pages[1]
    const third = pages[2]
    const last = pages[pages.length - 1]
    text(first, f.salutation, 171, 640, 9)
    text(first, f.birthdate, 369, 640, 9)
    text(first, f.firstName, 171, 619, 9)
    text(first, f.lastName, 369, 619, 9)
    text(first, f.street, 171, 596, 9)
    text(first, f.zip + " " + f.city, 369, 596, 9)
    text(first, f.phone, 171, 573, 9)
    text(first, f.email, 369, 573, 9)
    const meetingY: Record<string, number> = { Datenerhebung: 489, Beratungsgespräch: 470, Servicetermin: 450 }
    text(first, "X", 92, meetingY[f.meetingType] || 489, 10)
    const topicY: Record<string, number> = { pension: 374, health: 355, investment: 335, property: 316 }
    protocol.topics.forEach((t) => text(first, "X", 92, topicY[t], 10))
    text(first, protocol.contractCompany, 93, 230, 9)
    text(first, protocol.contractBranch, 302, 230, 9)
    const markAnswers = (page: Page, answers: string[], ys: number[]) =>
      answers.forEach((a, i) => text(page, "X", a === "yes" ? 95 : 116, ys[i], 9))
    markAnswers(second, protocol.answers.general, [660, 637, 613, 589, 565, 534, 504, 479])
    if (protocol.topics.includes("health")) {
      markAnswers(second, protocol.answers.health, [369, 328, 294])
      wrap(second, protocol.motives.health, 100, 205, 395, 8, 11, 9)
    }
    if (protocol.topics.includes("investment")) {
      markAnswers(third, protocol.answers.investment, [656, 621, 587])
      wrap(third, protocol.motives.investment, 100, 515, 395, 8, 11, 9)
    }
    if (protocol.topics.includes("property")) {
      markAnswers(third, protocol.answers.property, [298])
      wrap(third, protocol.motives.property, 100, 235, 395, 8, 11, 9)
    }
    const cancellationY: Record<string, number> = { forward: 656, self: 634, none: 617 }
    text(last, "X", 116, cancellationY[protocol.cancellation], 9)
    text(last, dateText, 86, 250, 8)
    signCustomer()
    text(last, dateText, 86, 187, 8)
    text(last, f.advisorName + (f.finma ? " | FINMA " + f.finma : ""), 300, 190, 7)
    signAdvisor()
  }
  if (id === "pk") {
    const pkFirst = pages[0]
    const pkLast = pages[pages.length - 1]
    text(pkFirst, f.lastName, 118, 625, 9)
    text(pkFirst, f.firstName, 132, 602, 9)
    text(pkFirst, f.birthdate, 155, 579, 9)
    text(pkFirst, pk.ahvNumber, 298, 579, 9)
    text(pkFirst, address, 163, 557, 9)
    text(pkFirst, f.phone, 163, 466, 9)
    if (pk.death.enabled) {
      text(pkFirst, pk.death.deathDate, 149, 385, 8)
      text(pkFirst, pk.death.survivorLast, 117, 339, 8)
      text(pkFirst, pk.death.survivorFirst, 326, 339, 8)
      text(pkFirst, pk.death.survivorBirth, 160, 317, 8)
      text(pkFirst, pk.death.relationship, 351, 317, 8)
      text(pkFirst, pk.death.survivorAddress, 149, 294, 8)
    }
    const jobY = [135, 110, 85, 60]
    pk.jobs.forEach((j, i) => {
      if (i > 3) return
      text(pkFirst, j.from, 82, jobY[i], 7)
      text(pkFirst, j.to, 149, jobY[i], 7)
      text(pkFirst, j.employer, 212, jobY[i], 7)
      text(pkFirst, j.role, 358, jobY[i], 7)
    })
    text(pkLast, pk.previousPension, 149, 725, 9)
    text(pkLast, pk.previousPensionAddress, 149, 703, 9)
    const benefitY = [586, 575, 564, 552]
    pk.benefits.forEach((a, i) => text(pkLast, "X", a === "yes" ? 303 : 337, benefitY[i], 9))
    text(pkLast, dateText, 150, 309, 8)
    signCustomer()
    const attachmentY = [118, 107, 95, 84, 72, 61]
    pk.attachments.forEach((i) => text(pkLast, "X", 86, attachmentY[i], 9))
  }

  return pdf.save()
}

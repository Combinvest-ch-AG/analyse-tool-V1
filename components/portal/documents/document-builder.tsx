"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, CheckCircle2, Download, FileText, Loader2 } from "lucide-react"
import { saveDocuments } from "@/app/actions/portal"
import { SignaturePad, type SignaturePadHandle } from "./signature-pad"

type DocDef = { id: string; name: string; tag: string; file: string; checked?: boolean }

const DEFINITIONS: DocDef[] = [
  { id: "protocol", name: "Beratungsprotokoll Combinvest", tag: "Standard", file: "/documents/templates/beratungsprotokoll-vorlage.pdf", checked: true },
  { id: "generalvollmacht", name: "Generalvollmacht", tag: "Vollmacht", file: "/documents/templates/vollmacht-vorsorgeinformationen.pdf" },
  { id: "vag", name: "Informationspflichten gemäss VAG", tag: "Versicherung", file: "/documents/templates/vag-informationspflicht.pdf" },
  { id: "kk", name: "Kündigung Krankenkasse", tag: "Kündigung", file: "/documents/templates/kuendigung-kvg-vvg.pdf" },
  { id: "private", name: "Maklermandat Combinvest (Privatperson)", tag: "Privatkunde", file: "/documents/templates/maklermandat-privat.pdf" },
  { id: "company", name: "Maklermandat Combinvest (Firma)", tag: "Firmenkunde", file: "/documents/templates/maklermandat-firma.pdf" },
  { id: "triveso-private", name: "Maklermandat Triveso (Privatperson)", tag: "Privatkunde", file: "/documents/templates/maklermandat-triveso-privat.pdf" },
  { id: "triveso-company", name: "Maklermandat Triveso (Firma)", tag: "Firmenkunde", file: "/documents/templates/maklermandat-triveso-firma.pdf" },
  { id: "pension", name: "Vollmacht Vorsorgeinformationen", tag: "Vorsorge", file: "/documents/templates/vollmacht-vorsorgeinformationen.pdf" },
  { id: "pk", name: "PK-Gelder einholen", tag: "Vorsorge", file: "/documents/templates/pk-gelder-einholen.pdf" },
]

const KK_COMPANIES = [
  "Agrisano", "AKKB", "Aquilana", "Assura", "Atupri", "Avenir (Groupe Mutuel)", "CONCORDIA", "CSS", "Easy Sana (Groupe Mutuel)", "EGK", "Helsana", "KLuG", "KPT", "Mutuel (Groupe Mutuel)", "ÖKK", "Philos (Groupe Mutuel)", "Sanitas", "sana24", "Sumiswalder", "SWICA", "Sympany", "Visana", "Vivao Sympany", "Andere",
]

type ProtocolGroup = { id: string; title: string; topic?: string; questions: string[] }
const PROTOCOL_GROUPS: ProtocolGroup[] = [
  {
    id: "general",
    title: "Allgemeine Fragen",
    questions: [
      "Mit der Beratung und der betreuenden Person zufrieden?",
      "Wurden alle Fragen vollständig und zufriedenstellend geklärt?",
      "Wurden alle Angaben zu vermittelten Produkten wahrheitsgetreu gemacht?",
      "Wurden sämtliche Kosten erklärt und sind diese langfristig tragbar?",
      "Entsprechen die Produkte den Zielen und wurde über alle Risiken aufgeklärt?",
      "Wurden Bedingungen und schriftliche Produktinformationen erklärt bzw. abgegeben?",
      "Wurden Laufzeit, Kündigungsmöglichkeiten und Fristen erklärt?",
      "Ist bewusst, dass es sich um verbindliche Anfragen und nicht um Offertanfragen handelt?",
    ],
  },
  { id: "health", title: "Gesundheitsvorsorge", topic: "health", questions: ["Wurde über Risiken, Versicherer, Deckungsumfang und Prämien informiert?", "Wurde über mögliche Karenzfristen informiert?", "Wurde ein Überblick über die Versicherungsleistungen abgegeben?"] },
  { id: "investment", title: "Vermögensanlagen", topic: "investment", questions: ["Ist der langfristige Anlagehorizont von teilweise 10 bis 15 Jahren bewusst?", "Ist bewusst, dass Wertentwicklung und Rendite nicht vorhersagbar sind?", "Ist die Volatilität wertschriftgebundener Anlagen bewusst?"] },
  { id: "property", title: "Sach- und Vermögensversicherungen", topic: "property", questions: ["Stimmt das versicherte Risiko der neuen Deckung mit dem Bedarf überein?"] },
]

const TOPICS = [
  { id: "pension", label: "Vorsorge" },
  { id: "health", label: "Gesundheitsvorsorge" },
  { id: "investment", label: "Vermögensanlagen" },
  { id: "property", label: "Sach- und Vermögensversicherungen" },
]
const BENEFITS = ["Altersrente AHV", "Invalidenrente IV", "Hinterbliebenenrente AHV", "Rente der 2. Säule BVG"]
const ATTACHMENTS = ["AHV-Ausweis", "Lohnausweis", "Versichertenausweis 2. Säule", "IK-Auszug", "Vollmacht", "Todesfallbescheinigung"]
const STEP_LABELS = ["Berater", "Kunde", "Kontakt", "Dokumente", "Beratung", "Signaturen"]

export type DocumentPrefill = {
  advisorName: string
  advisorEmail: string
  finma: string
  advisorStreet: string
  advisorZipCity: string
  firstName: string
  lastName: string
  birthdate: string
  email: string
  phone: string
  street: string
  zip: string
  city: string
}

type Protocol = {
  topics: string[]
  contractCompany: string
  contractBranch: string
  cancellation: string
  answers: Record<string, string[]>
  motives: Record<string, string>
}
type PkDeath = { enabled: boolean; deathDate: string; survivorLast: string; survivorFirst: string; survivorBirth: string; relationship: string; survivorAddress: string }
type Pk = {
  ahvNumber: string
  previousPension: string
  previousPensionAddress: string
  jobs: { from: string; to: string; employer: string; role: string }[]
  benefits: string[]
  attachments: number[]
  death: PkDeath
}
type Cancellation = {
  kkCompany: string
  kkPolicy: string
  kkScope: string[]
  kkDate: string
}

export function DocumentBuilder({
  analysisId,
  customerId,
  prefill,
  initial,
}: {
  analysisId: string
  customerId: string
  prefill: DocumentPrefill
  initial?: Record<string, unknown>
}) {
  const draft = initial?.draft && typeof initial.draft === "object" ? initial.draft as Record<string, unknown> : {}
  const draftForm = draft.form && typeof draft.form === "object" ? draft.form as Record<string, unknown> : {}
  const [panel, setPanel] = useState(0)
  const [type, setType] = useState<"private" | "company">(draft.type === "company" ? "company" : "private")
  const [f, setF] = useState({
    advisorName: String(draftForm.advisorName ?? prefill.advisorName),
    advisorEmail: String(draftForm.advisorEmail ?? prefill.advisorEmail),
    finma: String(draftForm.finma ?? prefill.finma),
    advisorStreet: String(draftForm.advisorStreet ?? (prefill.advisorStreet || "Hausimollstrasse 3")),
    advisorZipCity: String(draftForm.advisorZipCity ?? (prefill.advisorZipCity || "4622 Egerkingen")),
    date: String(draftForm.date ?? new Date().toISOString().slice(0, 10)),
    salutation: String(draftForm.salutation ?? "Herr"),
    birthdate: String(draftForm.birthdate ?? prefill.birthdate),
    firstName: String(draftForm.firstName ?? prefill.firstName),
    lastName: String(draftForm.lastName ?? prefill.lastName),
    company: String(draftForm.company ?? ""),
    email: String(draftForm.email ?? prefill.email),
    phone: String(draftForm.phone ?? prefill.phone),
    street: String(draftForm.street ?? prefill.street),
    zip: String(draftForm.zip ?? prefill.zip),
    city: String(draftForm.city ?? prefill.city),
    meetingType: String(draftForm.meetingType ?? "Datenerhebung"),
    place: String(draftForm.place ?? ""),
    decision: String(draftForm.decision ?? ""),
  })
  const [selected, setSelected] = useState<string[]>(Array.isArray(draft.selected) ? draft.selected.filter((value): value is string => typeof value === "string") : ["protocol"])
  const [protocol, setProtocol] = useState<Protocol>(
    draft.protocol && typeof draft.protocol === "object" ? draft.protocol as Protocol : {
      topics: [],
      contractCompany: "",
      contractBranch: "",
      cancellation: "forward",
      answers: Object.fromEntries(PROTOCOL_GROUPS.map((g) => [g.id, g.questions.map(() => "")])),
      motives: {},
    },
  )
  const [pk, setPk] = useState<Pk>(draft.pk && typeof draft.pk === "object" ? draft.pk as Pk : {
    ahvNumber: "",
    previousPension: "",
    previousPensionAddress: "",
    jobs: [0, 1, 2, 3].map(() => ({ from: "", to: "", employer: "", role: "" })),
    benefits: BENEFITS.map(() => "no"),
    attachments: [],
    death: { enabled: false, deathDate: "", survivorLast: "", survivorFirst: "", survivorBirth: "", relationship: "", survivorAddress: "" },
  })
  const [cancel, setCancel] = useState<Cancellation>(draft.cancel && typeof draft.cancel === "object" ? draft.cancel as Cancellation : {
    kkCompany: "",
    kkPolicy: "",
    kkScope: ["KVG"],
    kkDate: "",
  })
  const [advisorLater, setAdvisorLater] = useState(Boolean(draft.advisorLater))
  const [consent, setConsent] = useState(Boolean(draft.consent))
  const [status, setStatus] = useState<string | null>(null)
  const [downloads, setDownloads] = useState<{ name: string; url: string; file: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initialAutosave = useRef(true)

  useEffect(() => {
    if (initialAutosave.current) {
      initialAutosave.current = false
      return
    }
    setStatus("Änderungen werden gespeichert …")
    const timer = window.setTimeout(async () => {
      const result = await saveDocuments({
        analysisId,
        documents: {
          customerId,
          draft: { type, form: f, selected, protocol, pk, cancel, advisorLater, consent },
        },
        writeRevision: false,
      })
      setStatus(result.ok ? "Entwurf automatisch gespeichert." : "Entwurf konnte nicht gespeichert werden.")
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [advisorLater, analysisId, cancel, consent, customerId, f, pk, protocol, selected, type])

  const customerRef = useRef<SignaturePadHandle>(null)
  const advisorRef = useRef<SignaturePadHandle>(null)

  const set = (key: keyof typeof f, value: string) => setF((prev) => ({ ...prev, [key]: value }))
  const toggleDoc = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const protocolOn = selected.includes("protocol")
  const pkOn = selected.includes("pk")
  const kkOn = selected.includes("kk")

  const selectedDefs = useMemo(() => DEFINITIONS.filter((d) => selected.includes(d.id)), [selected])

  function next() {
    if (!validate(panel)) return
    setPanel((p) => Math.min(5, p + 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  function prev() {
    setPanel((p) => Math.max(0, p - 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function validate(n: number): boolean {
    setError(null)
    const req: Record<number, (keyof typeof f)[]> = {
      0: ["advisorName", "advisorEmail", "advisorStreet", "advisorZipCity", "date"],
      1: ["firstName", "lastName"],
      2: ["email", "street", "zip", "city"],
      4: ["place"],
    }
    for (const key of req[n] ?? []) {
      if (!String(f[key] ?? "").trim()) {
        setError("Bitte alle Pflichtfelder ausfüllen.")
        return false
      }
    }
    if (n === 3 && selected.length === 0) {
      setError("Bitte wählen Sie mindestens ein Dokument aus.")
      return false
    }
    if (n === 4 && protocolOn) {
      if (protocol.topics.length === 0) {
        setError("Bitte wählen Sie mindestens ein Beratungsthema aus.")
        return false
      }
      const needed = ["general", ...protocol.topics.filter((t) => t !== "pension")]
      for (const gid of needed) {
        if ((protocol.answers[gid] ?? []).some((a) => !a)) {
          setError("Bitte beantworten Sie alle sichtbaren Fragen mit Ja oder Nein.")
          return false
        }
      }
    }
    if (n === 4 && pkOn) {
      if (!f.birthdate) {
        setError("Für die PK-Anfrage wird das Geburtsdatum benötigt.")
        return false
      }
      if (!pk.ahvNumber) {
        setError("Bitte geben Sie die AHV-Nummer ein.")
        return false
      }
      if (!pk.jobs.some((j) => j.from && j.to && j.employer)) {
        setError("Bitte erfassen Sie mindestens ein früheres Arbeitsverhältnis vollständig.")
        return false
      }
      if (pk.death.enabled && (!pk.death.deathDate || !pk.death.survivorLast || !pk.death.survivorFirst || !pk.death.relationship)) {
        setError("Bitte vervollständigen Sie die Angaben zum Todesfall.")
        return false
      }
    }
    if (n === 4 && kkOn) {
      if (!cancel.kkCompany || !cancel.kkDate || cancel.kkScope.length === 0) {
        setError("Bitte Gesellschaft, gekündigten Bereich und Kündigungsdatum der Krankenkasse angeben.")
        return false
      }
    }
    return true
  }

  async function createPdf(def: DocDef, PDFLib: typeof import("pdf-lib")) {
    const { PDFDocument, StandardFonts, rgb, PDFName, PDFDict, PDFRawStream } = PDFLib
    const bytes = await fetch(def.file).then((r) => {
      if (!r.ok) throw new Error(def.name)
      return r.arrayBuffer()
    })
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
    const full = (f.company && type === "company" ? f.company + " / " : "") + f.firstName + " " + f.lastName
    const address = f.street + ", " + f.zip + " " + f.city

    // Feldwert setzen und dabei eine kompakte, gut lesbare Schriftgroesse erzwingen.
    // Ohne explizite Groesse skalieren die Vorlagen-Felder auf Auto-Groesse: der Text
    // wird riesig, schwebt ueber den Linien und laeuft am Rand ueber (z. B. die E-Mail).
    const safeField = (name: string, value: string, size = 10) => {
      try {
        const field = pdf.getForm().getTextField(name)
        field.setText(value || "")
        field.setFontSize(size)
      } catch {
        /* field not present */
      }
    }

    if (def.id === "private" || def.id === "company") {
      safeField("Name", full)
      safeField("Strasse  Nr", f.street)
      safeField("PLZ  Ort", f.zip + " " + f.city)
      safeField("Telefonnummer", f.phone)
      safeField("Email", f.email)
      safeField("Text1", f.place + ", " + f.date)
      safeField("Text2", f.place + ", " + f.date)
    }
    // Generalvollmacht nutzt dieselbe Vorlage wie die Vollmacht Vorsorgeinformationen.
    if (def.id === "pension" || def.id === "generalvollmacht") {
      const fields: Record<string, string> = {
        "Text Box 1": full,
        "Text Box 1_2": f.street,
        "Text Box 1_3": f.zip + " " + f.city,
        "Text Box 1_4": f.birthdate,
        "Text Box 1_5": f.advisorName,
        "Text Box 1_6": f.place + ", " + f.date,
        "Text Box 1_7": f.place + ", " + f.date,
      }
      Object.entries(fields).forEach(([k, v]) => safeField(k, v))
    }
    if (def.id === "triveso-private") {
      // Feldnamen sind zufällig; Zuordnung erfolgt über die exakte Position.
      const fields: Record<string, string> = {
        "Text-A0_PYS-9-8": f.salutation, // Anrede (links, y652)
        "Text-QNCXd6HnhQ": f.birthdate, // Geburtsdatum (rechts, y653)
        "Text-0N-N1EAc1l": f.firstName, // Vorname (links, y626)
        "Text-j18-8a9oz5": f.lastName, // Nachname (rechts, y624)
        "Text-3VQSSwokG-": f.street, // Strasse (links, y598)
        "Text-TfylkX6tRv": f.zip + " " + f.city, // PLZ/Ort (rechts, y598)
        "Text-3SUUcZKDzd": f.phone, // Telefon (links, y572)
        "Text-Qpw5oP2k-c": f.email, // Email (rechts, y571)
        "Text-8tapIkXUNW": (f.place || f.city) + ", " + f.date, // Ort/Datum Auftraggeber
        "Text-qQJbfRMLiG": (f.place || f.city) + ", " + f.date, // Ort/Datum Auftragnehmer
      }
      Object.entries(fields).forEach(([k, v]) => safeField(k, v))
    }
    if (def.id === "triveso-company") {
      const fields: Record<string, string> = {
        "Text-3uqA1Rn3Ye": f.company || full, // Firma (breit, y626)
        "Text-yagTWQstLB": full, // Name (links, y598)
        "Text-kL5RHfqaAT": f.zip + " " + f.city, // PLZ/Ort (rechts, y598)
        "Text-IqxFz4tNkR": f.street, // Strasse (links, y571)
        "Text-qqJkVb3-Pl": f.phone + "  " + f.email, // Telefon/Email (rechts, y571)
        "Text-ugfUrNU5WH": (f.place || f.city) + ", " + f.date, // Ort/Datum Auftraggeber
        "Text-5Z-o08otbZ": (f.place || f.city) + ", " + f.date, // Ort/Datum Auftragnehmer
      }
      Object.entries(fields).forEach(([k, v]) => safeField(k, v))
    }
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    // Font explizit uebergeben: einige Vorlagen (z. B. Vorsorgevollmacht) haben eine
    // Default-Appearance, die eine im Formular nicht vorhandene Schrift referenziert.
    // Ohne Font scheitert die Neugenerierung still und die Felder bleiben leer.
    try {
      pdf.getForm().updateFieldAppearances(font)
    } catch {
      /* ignore */
    }

    const ink = rgb(0.07, 0.12, 0.2)
    const pages = pdf.getPages()
    const dateText = (f.place || f.city) + ", " + f.date

    const embedSignature = async (handle: SignaturePadHandle | null) => {
      if (!handle || handle.isEmpty()) return null
      const raw = await fetch(handle.toDataURL()).then((r) => r.arrayBuffer())
      return pdf.embedPng(raw)
    }
    const customerImage = await embedSignature(customerRef.current)
    const advisorImage = advisorLater ? null : await embedSignature(advisorRef.current)

    type Page = ReturnType<typeof pdf.getPages>[number]
    type Img = Awaited<ReturnType<typeof pdf.embedPng>>
    const text = (page: Page, value: string, x: number, y: number, size = 9) => {
      if (value) page.drawText(String(value).slice(0, 80), { x, y, size, font, color: ink })
    }
    const wrap = (page: Page, value: string, x: number, y: number, width: number, size: number, lineHeight: number, maxLines = 8) => {
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
    const sign = (page: Page, image: Img | null, x: number, y: number, w: number, h: number) => {
      if (image) page.drawImage(image, { x, y, width: w, height: h })
    }

    if (def.id === "private" || def.id === "company") {
      const mandate = pages[0]
      text(mandate, f.salutation, 140, 646, 9)
      sign(mandate, customerImage, 315, 124, 205, 28)
      sign(mandate, advisorImage, 315, 78, 205, 28)
    }
    if (def.id === "triveso-private" || def.id === "triveso-company") {
      // Ort/Datum-Felder liegen links (x≈50); die Unterschrift kommt rechts daneben.
      const mandate = pages[0]
      sign(mandate, customerImage, 300, 118, 210, 30)
      sign(mandate, advisorImage, 300, 73, 210, 30)
    }
    if (def.id === "pension" || def.id === "generalvollmacht") {
      const pension = pages[0]
      sign(pension, customerImage, 72, 136, 205, 32)
      sign(pension, advisorImage, 300, 136, 205, 32)
    }
    if (def.id === "kk") {
      // Krankenkassen-Kündigung (KVG/VVG) – A4-Vorlage ohne Formularfelder.
      const kkPage = pages[0]
      // Die Vorlage traegt eingebrannte Alt-Daten der Vorbesitzerin (Name + zwei
      // Unterschriften) in einem Form-XObject, das der Seiteninhalt zuoberst zeichnet –
      // deshalb liegt es ueber allem, was wir ergaenzen. Wir leeren den Inhalt dieses
      // XObjects, sodass nur die leere Vorlage bleibt und unsere Daten sichtbar sind.
      try {
        const res = kkPage.node.Resources()
        const xobj = res?.lookup(PDFName.of("XObject"), PDFDict)
        if (xobj) {
          for (const [, value] of xobj.entries()) {
            if (!(value instanceof PDFRef)) continue
            const stream = kkPage.doc.context.lookup(value) as { dict?: unknown } | undefined
            if (stream && "dict" in stream && stream.dict) {
              kkPage.doc.context.assign(value, PDFRawStream.of(stream.dict as never, new Uint8Array([])))
            }
          }
        }
      } catch {
        /* kein XObject */
      }
      // Kleiner Rest eines Alt-Zeichens ueber der ersten Absender-Linie uebermalen.
      kkPage.drawRectangle({ x: 250, y: 780, width: 60, height: 12, color: rgb(1, 1, 1) })
      // Absender-Block (versicherte Person) – Text sitzt knapp ueber den Linien.
      text(kkPage, full, 60, 780, 9)
      text(kkPage, f.street, 60, 761, 9)
      text(kkPage, f.zip + " " + f.city, 60, 742, 9)
      text(kkPage, f.phone, 60, 723, 9)
      // Empfänger-Block (Einschreiben an die Krankenkasse)
      text(kkPage, cancel.kkCompany, 357, 629, 9)
      // Ort/Datum auf der Poststempel-Linie
      text(kkPage, dateText, 60, 540, 9)
      // Personenzeile 1: Name, Geburtsdatum, Unterschrift
      text(kkPage, full, 60, 330, 9)
      text(kkPage, f.birthdate, 246, 330, 9)
      sign(kkPage, customerImage, 340, 326, 92, 20)
      // "per"-Datum je nach gekündigtem Bereich (KVG obere, VVG untere Linie)
      if (cancel.kkScope.includes("KVG")) text(kkPage, cancel.kkDate, 505, 343, 8)
      if (cancel.kkScope.includes("VVG")) text(kkPage, cancel.kkDate, 505, 329, 8)
    }
    if (def.id === "vag") {
      const vagFirst = pages[0]
      const vag = pages[pages.length - 1]
      text(vagFirst, f.advisorName, 364, 703, 9)
      text(vagFirst, f.advisorStreet, 364, 681, 9)
      text(vagFirst, f.advisorZipCity, 364, 659, 9)
      text(vagFirst, f.finma, 364, 637, 9)
      text(vag, dateText, 72, 590, 8)
      text(vag, dateText, 324, 590, 8)
      sign(vag, advisorImage, 72, 480, 200, 45)
      sign(vag, customerImage, 324, 480, 200, 45)
    }
    if (def.id === "protocol") {
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
      sign(last, customerImage, 300, 247, 205, 34)
      text(last, dateText, 86, 187, 8)
      text(last, f.advisorName + (f.finma ? " | FINMA " + f.finma : ""), 300, 190, 7)
      sign(last, advisorImage, 440, 184, 70, 28)
    }
    if (def.id === "pk") {
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
      sign(pkLast, customerImage, 285, 290, 180, 28)
      const attachmentY = [118, 107, 95, 84, 72, 61]
      pk.attachments.forEach((i) => text(pkLast, "X", 86, attachmentY[i], 9))
    }
    return pdf.save()
  }

  async function generate() {
    setError(null)
    if (customerRef.current?.isEmpty()) {
      setError("Bitte die Unterschrift des Kunden erfassen.")
      return
    }
    if (!advisorLater && advisorRef.current?.isEmpty()) {
      setError("Bitte die Beraterunterschrift erfassen oder 'später' auswählen.")
      return
    }
    if (!consent) {
      setError("Bitte die Bestätigung aktivieren.")
      return
    }
    setBusy(true)
    setStatus(null)
    setDownloads([])
    try {
      const PDFLib = await import("pdf-lib")
      const results: { name: string; url: string; file: string }[] = []
      for (const def of selectedDefs) {
        const bytes = await createPdf(def, PDFLib)
        const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }))
        results.push({ name: def.name, url, file: `${def.id}_${f.lastName}_${f.date}_ready-to-send.pdf` })
      }
      setDownloads(results)
      await saveDocuments({
        analysisId,
        documents: {
          customerId,
          selected,
          documentNames: selectedDefs.map((d) => d.name),
          status: advisorLater ? "customer-signed-advisor-pending" : "ready-to-send",
          signedAt: new Date().toISOString(),
        },
      })
      setStatus(
        advisorLater
          ? "Dokumente erstellt. Kundenunterschrift gespeichert; Beraterunterschrift ist offen."
          : "Ready-to-send: Dokumente vollständig erstellt und in der Analyse gespeichert.",
      )
    } catch (e) {
      setError("Die PDFs konnten nicht erstellt werden. Bitte Vorlagen und Eingaben prüfen.")
      console.error("[v0] PDF generation failed:", e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/analyse/${analysisId}/abschluss`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zur Abschlusskontrolle
      </Link>

      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Beratungsabschluss</p>
        <h1 className="mt-1 text-2xl font-extrabold text-foreground">Dokumenterstellung</h1>
        <p className="mt-1 text-sm text-muted-foreground">Einmal erfassen, automatisch übernehmen und gemeinsam unterschreiben.</p>
      </div>

      {/* Stepper */}
      <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STEP_LABELS.map((label, i) => (
          <div
            key={label}
            className={`rounded-full px-2 py-1.5 text-center text-[11px] font-bold ${
              i === panel ? "bg-primary text-primary-foreground" : i < panel ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
            }`}
          >
            {i + 1} · {label}
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-card p-6">
        {panel === 0 && (
          <Panel title="Angaben Kundenberater" hint="Der angemeldete Berater ist vorausgewählt. Bei Stellvertretung können die Angaben angepasst werden.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field className="sm:col-span-2" label="Kundenberater*"><input className={INPUT} value={f.advisorName} onChange={(e) => set("advisorName", e.target.value)} /></Field>
              <Field label="E-Mail Kundenberater*"><input className={INPUT} type="email" value={f.advisorEmail} onChange={(e) => set("advisorEmail", e.target.value)} /></Field>
              <Field label="FINMA-Registernummer"><input className={INPUT} value={f.finma} onChange={(e) => set("finma", e.target.value)} placeholder="Falls hinterlegt" /></Field>
              <Field label="Datum der Kundenberatung*"><input className={INPUT} type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
              <Field label="Berateradresse*"><input className={INPUT} value={f.advisorStreet} onChange={(e) => set("advisorStreet", e.target.value)} /></Field>
              <Field label="PLZ / Ort Berater*"><input className={INPUT} value={f.advisorZipCity} onChange={(e) => set("advisorZipCity", e.target.value)} /></Field>
            </div>
          </Panel>
        )}

        {panel === 1 && (
          <Panel title="Basisdaten Kunde" hint="Kundentyp und persönliche Angaben bestimmen die passenden Dokumente.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                {(["private", "company"] as const).map((t) => (
                  <label key={t} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-semibold ${type === t ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground"}`}>
                    <input type="radio" name="type" checked={type === t} onChange={() => setType(t)} className="accent-primary" />
                    {t === "private" ? "Privatkunde" : "Firmenkunde"}
                  </label>
                ))}
              </div>
              <Field label="Anrede*">
                <select className={INPUT} value={f.salutation} onChange={(e) => set("salutation", e.target.value)}>
                  <option>Herr</option><option>Frau</option><option>Divers</option>
                </select>
              </Field>
              <Field label="Geburtsdatum"><input className={INPUT} type="date" value={f.birthdate} onChange={(e) => set("birthdate", e.target.value)} /></Field>
              <Field label="Vorname*"><input className={INPUT} value={f.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
              <Field label="Nachname*"><input className={INPUT} value={f.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
              <Field className="sm:col-span-2" label="Firma"><input className={INPUT} value={f.company} onChange={(e) => set("company", e.target.value)} /></Field>
            </div>
          </Panel>
        )}

        {panel === 2 && (
          <Panel title="Kontaktdaten Kunde" hint="Diese Angaben werden in alle ausgewählten Dokumente übernommen.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="E-Mail Kunde*"><input className={INPUT} type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label="Telefon"><input className={INPUT} type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
              <Field className="sm:col-span-2" label="Strasse / Hausnummer*"><input className={INPUT} value={f.street} onChange={(e) => set("street", e.target.value)} /></Field>
              <Field label="Postleitzahl*"><input className={INPUT} inputMode="numeric" value={f.zip} onChange={(e) => set("zip", e.target.value)} /></Field>
              <Field label="Ortschaft*"><input className={INPUT} value={f.city} onChange={(e) => set("city", e.target.value)} /></Field>
            </div>
          </Panel>
        )}

        {panel === 3 && (
          <Panel title="Welche Dokumente werden benötigt?" hint="Jedes gewählte PDF wird ausgefüllt und direkt an seinen Originalpositionen unterschrieben.">
            <div className="grid gap-2.5">
              {DEFINITIONS.map((d) => {
                const on = selected.includes(d.id)
                return (
                  <label key={d.id} className={`flex items-center gap-3 rounded-xl border p-4 ${on ? "border-primary bg-primary/5" : "border-border"}`}>
                    <input type="checkbox" checked={on} onChange={() => toggleDoc(d.id)} className="h-5 w-5 accent-primary" />
                    <span className="flex-1">
                      <strong className="block text-sm text-foreground">{d.name}</strong>
                      <small className="text-xs text-muted-foreground">Daten werden automatisch in die PDF-Vorlage übernommen.</small>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <em className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold not-italic text-primary">{d.tag}</em>
                      {d.file ? (
                        <a className="text-xs font-bold text-primary hover:underline" target="_blank" rel="noopener noreferrer" href={d.file}>Vorlage ansehen</a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Wird automatisch erstellt</span>
                      )}
                    </span>
                  </label>
                )
              })}
            </div>
          </Panel>
        )}

        {panel === 4 && (
          <Panel title="Fragen zur Beratung" hint="Je nach Dokument erscheinen automatisch alle zusätzlich benötigten Formularfelder.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Art des Kundengesprächs*">
                <select className={INPUT} value={f.meetingType} onChange={(e) => set("meetingType", e.target.value)}>
                  <option>Datenerhebung</option><option>Beratungsgespräch</option><option>Servicetermin</option>
                </select>
              </Field>
              <Field label="Ort der Beratung*"><input className={INPUT} value={f.place} onChange={(e) => set("place", e.target.value)} placeholder="z. B. Zürich" /></Field>
              <Field className="sm:col-span-2" label="Zusammenfassung / Empfehlung"><textarea className={`${INPUT} min-h-24 resize-y`} value={f.decision} onChange={(e) => set("decision", e.target.value)} placeholder="Empfehlung, Begründung und Entscheid des Kunden" /></Field>
            </div>

            {protocolOn && (
              <div className="mt-6 border-t border-border pt-6">
                <h3 className="text-base font-bold text-foreground">Beratungsprotokoll vollständig ausfüllen</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Die Antworten werden exakt auf die vier Seiten des Original-PDFs übertragen.</p>

                <div className="mt-4 rounded-xl border border-border p-4">
                  <p className="text-sm font-bold text-foreground">Beratungsthemen</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {TOPICS.map((t) => {
                      const on = protocol.topics.includes(t.id)
                      return (
                        <label key={t.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm text-foreground">
                          <input type="checkbox" checked={on} onChange={() => setProtocol((p) => ({ ...p, topics: on ? p.topics.filter((x) => x !== t.id) : [...p.topics, t.id] }))} className="accent-primary" />
                          {t.label}
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label="Vertragsgesellschaft"><input className={INPUT} value={protocol.contractCompany} onChange={(e) => setProtocol((p) => ({ ...p, contractCompany: e.target.value }))} placeholder="Falls ein Vertrag abgeschlossen wurde" /></Field>
                  <Field label="Branche"><input className={INPUT} value={protocol.contractBranch} onChange={(e) => setProtocol((p) => ({ ...p, contractBranch: e.target.value }))} placeholder="z. B. Krankenversicherung" /></Field>
                </div>

                {PROTOCOL_GROUPS.map((g) => {
                  if (g.topic && !protocol.topics.includes(g.topic)) return null
                  return (
                    <div key={g.id} className="mt-4 overflow-hidden rounded-xl border border-border">
                      <h4 className="bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">{g.title}</h4>
                      {g.questions.map((q, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 first:border-t-0">
                          <span className="text-sm text-foreground">{q}</span>
                          <span className="flex flex-none gap-2">
                            {(["yes", "no"] as const).map((val) => (
                              <label key={val} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-foreground">
                                <input
                                  type="radio"
                                  name={`${g.id}${i}`}
                                  checked={protocol.answers[g.id]?.[i] === val}
                                  onChange={() => setProtocol((p) => ({ ...p, answers: { ...p.answers, [g.id]: p.answers[g.id].map((a, j) => (j === i ? val : a)) } }))}
                                  className="accent-primary"
                                />
                                {val === "yes" ? "Ja" : "Nein"}
                              </label>
                            ))}
                          </span>
                        </div>
                      ))}
                      {g.topic && (
                        <div className="border-t border-border p-4">
                          <Field label="Motiv des Abschlusses"><textarea className={`${INPUT} min-h-16 resize-y`} value={protocol.motives[g.id] ?? ""} onChange={(e) => setProtocol((p) => ({ ...p, motives: { ...p.motives, [g.id]: e.target.value } }))} placeholder="Warum wurde diese Lösung gewählt?" /></Field>
                        </div>
                      )}
                    </div>
                  )
                })}

                <div className="mt-4 overflow-hidden rounded-xl border border-border">
                  <h4 className="bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Kündigungen bestehender Verträge</h4>
                  <div className="p-4">
                    <select className={INPUT} value={protocol.cancellation} onChange={(e) => setProtocol((p) => ({ ...p, cancellation: e.target.value }))}>
                      <option value="forward">Kunde erlaubt die Weiterleitung unterzeichneter Kündigungen</option>
                      <option value="self">Kunde kündigt selbst</option>
                      <option value="none">Keine Kündigungen erforderlich</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {pkOn && (
              <div className="mt-6 border-t border-border pt-6">
                <h3 className="text-base font-bold text-foreground">PK-Gelder-Anfrage vollständig ausfüllen</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Die Angaben werden direkt in beide Seiten des offiziellen Fragebogens übertragen.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="AHV-Nummer*"><input className={INPUT} value={pk.ahvNumber} onChange={(e) => setPk((p) => ({ ...p, ahvNumber: e.target.value }))} placeholder="756.XXXX.XXXX.XX" /></Field>
                  <Field label="Ehemalige Vorsorgeeinrichtung"><input className={INPUT} value={pk.previousPension} onChange={(e) => setPk((p) => ({ ...p, previousPension: e.target.value }))} placeholder="Name" /></Field>
                  <Field className="sm:col-span-2" label="Adresse Vorsorgeeinrichtung"><input className={INPUT} value={pk.previousPensionAddress} onChange={(e) => setPk((p) => ({ ...p, previousPensionAddress: e.target.value }))} /></Field>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-border">
                  <h4 className="bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Frühere Arbeitsverhältnisse</h4>
                  <div className="grid gap-3 p-4">
                    {pk.jobs.map((job, i) => (
                      <div key={i} className="grid gap-2 sm:grid-cols-4">
                        <input className={INPUT} placeholder="Von (MM.JJJJ)" value={job.from} onChange={(e) => setPk((p) => ({ ...p, jobs: p.jobs.map((j, k) => (k === i ? { ...j, from: e.target.value } : j)) }))} />
                        <input className={INPUT} placeholder="Bis (MM.JJJJ)" value={job.to} onChange={(e) => setPk((p) => ({ ...p, jobs: p.jobs.map((j, k) => (k === i ? { ...j, to: e.target.value } : j)) }))} />
                        <input className={INPUT} placeholder="Arbeitgeber" value={job.employer} onChange={(e) => setPk((p) => ({ ...p, jobs: p.jobs.map((j, k) => (k === i ? { ...j, employer: e.target.value } : j)) }))} />
                        <input className={INPUT} placeholder="Tätigkeit" value={job.role} onChange={(e) => setPk((p) => ({ ...p, jobs: p.jobs.map((j, k) => (k === i ? { ...j, role: e.target.value } : j)) }))} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-border">
                  <h4 className="bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Bereits bezogene Rentenleistungen</h4>
                  {BENEFITS.map((b, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5">
                      <span className="text-sm text-foreground">{b}</span>
                      <span className="flex flex-none gap-2">
                        {(["yes", "no"] as const).map((val) => (
                          <label key={val} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-foreground">
                            <input type="radio" name={`benefit${i}`} checked={pk.benefits[i] === val} onChange={() => setPk((p) => ({ ...p, benefits: p.benefits.map((a, j) => (j === i ? val : a)) }))} className="accent-primary" />
                            {val === "yes" ? "Ja" : "Nein"}
                          </label>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-border">
                  <h4 className="bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Beilagen vorhanden</h4>
                  <div className="grid gap-2 p-4 sm:grid-cols-2">
                    {ATTACHMENTS.map((a, i) => {
                      const on = pk.attachments.includes(i)
                      return (
                        <label key={i} className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm text-foreground">
                          <input type="checkbox" checked={on} onChange={() => setPk((p) => ({ ...p, attachments: on ? p.attachments.filter((x) => x !== i) : [...p.attachments, i] }))} className="accent-primary" />
                          {a}
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-border">
                  <h4 className="bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Optional: Anfrage im Todesfall</h4>
                  <div className="p-4">
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input type="checkbox" checked={pk.death.enabled} onChange={(e) => setPk((p) => ({ ...p, death: { ...p.death, enabled: e.target.checked } }))} className="accent-primary" />
                      Angaben zu einer verstorbenen Person erfassen
                    </label>
                    {pk.death.enabled && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Field label="Todesdatum"><input className={INPUT} type="date" value={pk.death.deathDate} onChange={(e) => setPk((p) => ({ ...p, death: { ...p.death, deathDate: e.target.value } }))} /></Field>
                        <Field label="Name Hinterbliebene Person"><input className={INPUT} value={pk.death.survivorLast} onChange={(e) => setPk((p) => ({ ...p, death: { ...p.death, survivorLast: e.target.value } }))} /></Field>
                        <Field label="Vorname"><input className={INPUT} value={pk.death.survivorFirst} onChange={(e) => setPk((p) => ({ ...p, death: { ...p.death, survivorFirst: e.target.value } }))} /></Field>
                        <Field label="Geburtsdatum"><input className={INPUT} type="date" value={pk.death.survivorBirth} onChange={(e) => setPk((p) => ({ ...p, death: { ...p.death, survivorBirth: e.target.value } }))} /></Field>
                        <Field label="Verwandtschaftsgrad"><input className={INPUT} value={pk.death.relationship} onChange={(e) => setPk((p) => ({ ...p, death: { ...p.death, relationship: e.target.value } }))} /></Field>
                        <Field label="Adresse"><input className={INPUT} value={pk.death.survivorAddress} onChange={(e) => setPk((p) => ({ ...p, death: { ...p.death, survivorAddress: e.target.value } }))} /></Field>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {kkOn && (
              <div className="mt-6 border-t border-border pt-6">
                <h3 className="text-base font-bold text-foreground">Kündigung Krankenkasse</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Das Kündigungsschreiben wird mit den Kundendaten automatisch erstellt.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Krankenkasse*">
                    <select className={INPUT} value={cancel.kkCompany} onChange={(e) => setCancel((c) => ({ ...c, kkCompany: e.target.value }))}>
                      <option value="">Bitte wählen</option>
                      {KK_COMPANIES.map((k) => <option key={k}>{k}</option>)}
                    </select>
                  </Field>
                  <Field label="Policen-/Versichertennummer"><input className={INPUT} value={cancel.kkPolicy} onChange={(e) => setCancel((c) => ({ ...c, kkPolicy: e.target.value }))} /></Field>
                  <Field className="sm:col-span-2" label="Gekündigt wird*">
                    <div className="flex flex-wrap gap-2">
                      {["KVG (Grundversicherung)", "VVG (Zusatzversicherung)"].map((s) => {
                        const key = s.startsWith("KVG") ? "KVG" : "VVG"
                        const on = cancel.kkScope.includes(key)
                        return (
                          <label key={key} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${on ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground"}`}>
                            <input type="checkbox" checked={on} onChange={() => setCancel((c) => ({ ...c, kkScope: on ? c.kkScope.filter((x) => x !== key) : [...c.kkScope, key] }))} className="accent-primary" />
                            {s}
                          </label>
                        )
                      })}
                    </div>
                  </Field>
                  <Field label="Kündigung per*"><input className={INPUT} type="date" value={cancel.kkDate} onChange={(e) => setCancel((c) => ({ ...c, kkDate: e.target.value }))} /></Field>
                </div>
              </div>
            )}

          </Panel>
        )}

        {panel === 5 && (
          <Panel title="Prüfen & direkt unterschreiben" hint="Die Signaturen werden in jedem Original-PDF genau auf den vorgesehenen Linien platziert.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <h3 className="text-sm font-bold text-foreground">Kundendaten</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  <strong className="text-foreground">{f.salutation} {f.firstName} {f.lastName}</strong><br />
                  {f.street}<br />{f.zip} {f.city}<br />{f.email}<br />{f.phone}
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <h3 className="text-sm font-bold text-foreground">Dokumentpaket</h3>
                <ul className="mt-2 grid list-disc gap-1 pl-5 text-sm text-muted-foreground">
                  {selectedDefs.map((d) => <li key={d.id}>{d.name}</li>)}
                </ul>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <h3 className="text-sm font-bold text-foreground">Unterschrift Kunde</h3>
                <div className="mt-3"><SignaturePad ref={customerRef} ariaLabel="Unterschrift Kunde" /></div>
                <button type="button" onClick={() => customerRef.current?.clear()} className="mt-2 text-xs font-bold text-primary">Neu zeichnen</button>
              </div>
              <div className="rounded-xl border border-border p-4">
                <h3 className="text-sm font-bold text-foreground">Unterschrift Kundenberater</h3>
                <div className="mt-3"><SignaturePad ref={advisorRef} ariaLabel="Unterschrift Kundenberater" /></div>
                <button type="button" onClick={() => advisorRef.current?.clear()} className="mt-2 text-xs font-bold text-primary">Neu zeichnen</button>
                <label className="mt-2 flex items-center gap-2 text-xs text-foreground">
                  <input type="checkbox" checked={advisorLater} onChange={(e) => setAdvisorLater(e.target.checked)} className="accent-primary" />
                  Berater unterschreibt später
                </label>
              </div>
            </div>

            <label className="mt-4 flex items-start gap-2 rounded-xl border border-border p-3.5 text-sm text-foreground">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-primary" />
              Kunde bestätigt die Richtigkeit der Angaben und den Erhalt der ausgewählten Unterlagen.
            </label>

            <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-3.5 text-xs leading-relaxed text-foreground">
              <strong>Rechtlicher Hinweis:</strong> Die gezeichneten Signaturen werden technisch als einfache elektronische Signaturen dokumentiert. Eine qualifizierte elektronische Signatur nach ZertES benötigt einen anerkannten Signaturdienst.
            </div>

            {status && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-success/10 p-3.5 text-sm font-semibold text-success">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" /> {status}
              </div>
            )}

            {downloads.length > 0 && (
              <div className="mt-3 grid gap-2">
                {downloads.map((d) => (
                  <a key={d.file} href={d.url} download={d.file} className="flex items-center justify-between rounded-xl border border-border bg-background p-3.5 text-sm text-foreground transition-colors hover:bg-muted">
                    <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> {d.name}</span>
                    <span className="inline-flex items-center gap-1 font-bold text-primary"><Download className="h-4 w-4" /> PDF speichern</span>
                  </a>
                ))}
                <Link href={`/analyse/${analysisId}/abschluss`} className="flex items-center justify-between rounded-xl border border-border bg-background p-3.5 text-sm text-foreground transition-colors hover:bg-muted">
                  <span className="font-bold">Zur Abschlusskontrolle</span>
                  <span className="inline-flex items-center gap-1 font-bold text-primary">Weiter <ArrowRight className="h-4 w-4" /></span>
                </Link>
              </div>
            )}
          </Panel>
        )}

        {error && <p className="mt-4 text-sm font-semibold text-destructive">{error}</p>}

        {/* Nav */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" onClick={prev} disabled={panel === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </button>
          {panel < 5 ? (
            <button type="button" onClick={next} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-deep">
              Weiter <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={generate} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {busy ? "PDFs werden erstellt …" : "Dokumentpaket erstellen"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const INPUT =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`grid gap-1.5 ${className ?? ""}`}>
      <span className="text-xs font-semibold text-foreground">{label}</span>
      {children}
    </label>
  )
}

function Panel({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      <div className="mt-5">{children}</div>
    </div>
  )
}

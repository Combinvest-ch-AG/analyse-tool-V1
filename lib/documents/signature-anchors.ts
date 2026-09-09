/**
 * Signatur-Ankerpunkte pro Dokument – identisch zu den Koordinaten, an denen der
 * Document-Builder (components/portal/documents/document-builder.tsx) die
 * Unterschriften einzeichnet. Die Remote-Signatur bettet die Kundenunterschrift
 * exakt an dieselbe Stelle ein, damit vor Ort und per E-Mail deckungsgleich sind.
 *
 * Koordinatensystem: pdf-lib, Ursprung unten links, in PDF-Punkten.
 * `page: "first"` = erste Seite, `page: "last"` = letzte Seite des Templates.
 */
export type SignAnchor = { page: "first" | "last"; x: number; y: number; w: number; h: number }

export const CUSTOMER_SIGN_ANCHORS: Record<string, SignAnchor> = {
  private: { page: "first", x: 315, y: 124, w: 205, h: 28 },
  company: { page: "first", x: 315, y: 124, w: 205, h: 28 },
  "triveso-private": { page: "first", x: 300, y: 118, w: 210, h: 30 },
  "triveso-company": { page: "first", x: 300, y: 118, w: 210, h: 30 },
  pension: { page: "first", x: 72, y: 136, w: 205, h: 32 },
  generalvollmacht: { page: "first", x: 72, y: 136, w: 205, h: 32 },
  kk: { page: "first", x: 340, y: 326, w: 92, h: 20 },
  vag: { page: "last", x: 324, y: 480, w: 200, h: 45 },
  protocol: { page: "last", x: 300, y: 247, w: 205, h: 34 },
  pk: { page: "last", x: 285, y: 290, w: 180, h: 28 },
}

/** Berater-Anker (nur Dokumente mit Beraterunterschrift). */
export const ADVISOR_SIGN_ANCHORS: Record<string, SignAnchor> = {
  private: { page: "first", x: 315, y: 78, w: 205, h: 28 },
  company: { page: "first", x: 315, y: 78, w: 205, h: 28 },
  "triveso-private": { page: "first", x: 300, y: 73, w: 210, h: 30 },
  "triveso-company": { page: "first", x: 300, y: 73, w: 210, h: 30 },
  pension: { page: "first", x: 300, y: 136, w: 205, h: 32 },
  generalvollmacht: { page: "first", x: 300, y: 136, w: 205, h: 32 },
  vag: { page: "last", x: 72, y: 480, w: 200, h: 45 },
  protocol: { page: "last", x: 440, y: 184, w: 70, h: 28 },
}

export const SIGNATURE_BUCKET = "analysis-documents"

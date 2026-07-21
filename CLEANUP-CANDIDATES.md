# Löschkandidaten – Legacy-Original-Dateien

> **Status: NUR LISTE – NICHTS LÖSCHEN.**
> Diese Dateien sind das ursprüngliche statische Original (HTML/JS/CSS + Duplikate),
> das vollständig in die Next.js-App nachgebaut und optisch/funktional verifiziert wurde.
> Sie werden **bewusst noch behalten** (Referenz / Sicherheitsnetz für ein paar Wochen).
>
> Erst wenn ausdrücklich mit Referenz auf diese Liste das Go kommt
> („jetzt kannst du alles löschen"), dürfen diese Dateien entfernt werden.
>
> Erstellt: 2026-07-21
> Verifiziert: kein aktiver Import aus `.ts`/`.tsx` auf eine dieser Dateien (geprüft per Grep).

---

## WICHTIG – NICHT auf dieser Liste (aktiv genutzt, niemals löschen)

Diese sehen wie „Original" aus, werden aber zur Laufzeit von der neuen App gebraucht:

- `public/assets/risk/*.webp` — Themen-Bilder, geladen via `/assets/risk/...` (aktiv, HTTP 200)
- `public/documents/templates/*.pdf` — PDF-Vorlagen, vom DocumentBuilder zur Laufzeit gefetcht (`/documents/templates/...`)
- `lib/engine/*.ts` — die portierten Rechen-Engines (aktiv importiert)
- alle `app/`, `components/`, `lib/` (TypeScript/TSX) — die neue App

---

## 1. Legacy-HTML-Seiten (Root) — 25 Dateien

Vollständig nachgebaut als Next.js-Routen. Löschbar.

| Original (löschbar)              | Nachgebaut als Route                          |
|----------------------------------|-----------------------------------------------|
| `index.html`                     | `/` (app/page.tsx)                            |
| `login.html`                     | `/login`                                      |
| `dashboard.html`                 | `/dashboard`                                  |
| `kunde.html`                     | `/kunde/[id]`                                 |
| `analyse.html`                   | `/analyse/[id]`                               |
| `analyse-claude-legacy.html`     | (Alt-Entwurf, ersetzt)                        |
| `analyse-codex-modern.html`      | (Alt-Entwurf, ersetzt)                        |
| `thema.html`                     | `/analyse/[id]/thema/[bereich]`               |
| `abschluss.html`                 | `/analyse/[id]/abschluss`                     |
| `dokumente.html`                 | `/analyse/[id]/dokumente`                     |
| `empfehlung.html`                | `/analyse/[id]/empfehlung`                    |
| `vorsorgerechner.html`           | `/rechner/vorsorge`                           |
| `franchise.html`                 | `/rechner/franchise`                          |
| `immobilienrechner.html`         | `/rechner/tragbarkeit`                        |
| `rentenrechner.html`             | `/rechner/ahv`                                |
| `budgetrechner.html`             | `/rechner/budget`                             |
| `vermoegensrechner.html`         | `/rechner/vermoegen`                          |
| `anlegerprofil.html`             | `/rechner/anlegerprofil`                      |
| `pk-ausweis.html`                | `/rechner/pk-ausweis`                         |
| `freizuegigkeitskonto.html`      | `/rechner/freizuegigkeit`                     |
| `zusatzversicherung.html`        | `/versicherung/zusatz`                        |
| `versicherungscheck.html`        | `/versicherung/sach-motor`                    |
| `versicherungsberatung.html`     | `/versicherung/uebersicht`                    |
| `beratungsservices.html`         | (Legacy-Aggregator; ersetzt durch dedizierte Rechner-/Service-Seiten) |
| `sealth-check.html`              | `/sealth`                                     |

## 2. Legacy-JavaScript (Root) — 17 Dateien

Client-Logik der alten HTML-Seiten. Logik ist in TS/TSX portiert. Löschbar.

- `abschluss.js`
- `advisor-store.js`
- `advisors-data.js`
- `advisory-report.js`
- `app-shell.js`
- `calculator-shell.js`
- `crm-session.js`
- `form-experience.js`
- `franchise.js`
- `pension-guide.js`
- `supabase-auth.js`
- `supabase-config.js`
- `supabase-data.js`
- `versicherungsberatung.js`
- `versicherungscheck.js`
- `wealth-chart.js`
- `zusatzversicherung.js`

## 3. Legacy-CSS (Root) — 14 Dateien

Styling der alten HTML-Seiten. Ersetzt durch Tailwind/globals.css. Löschbar.

- `abschluss.css`
- `advisor.css`
- `app-shell.css`
- `calculator-shell.css`
- `design-system.css`
- `form-experience.css`
- `franchise.css`
- `immobilienrechner.css`
- `pension-guide.css`
- `platform-polish.css`
- `service-workflows.css`
- `versicherungsberatung.css`
- `versicherungscheck.css`
- `zusatzversicherung.css`

## 4. Legacy-Assets (Root `assets/`) — löschbar

Nur von den alten HTML-Seiten benutzt. Die aktive App nutzt `public/assets/...`.

- `assets/combinvest-secure.js` (Legacy-Verschlüsselungs-/Speicherhelfer)
- `assets/d3.min.js` (nur altes Budget-Sankey)
- `assets/d3-sankey.min.js` (nur altes Budget-Sankey)
- `assets/risk/*.webp` — **DUPLIKAT** von `public/assets/risk/*.webp`.
  Nur die Root-Kopie ist löschbar; die `public/`-Kopie MUSS bleiben.

## 5. Legacy-Engines (Root `engine/`) — mit Vorsicht

Nach `lib/engine/*.ts` portiert und nicht mehr importiert → grundsätzlich löschbar.

- `engine/affordability-engine.mjs`
- `engine/franchise-engine.mjs`
- `engine/pension-engine.mjs`

**Hinweis / Abwägung:** Die zugehörigen Tests sind aktuell die **einzigen**
automatisierten Tests der Rechenlogik:

- `engine/affordability-engine.test.mjs`
- `engine/franchise-engine.test.mjs`
- `engine/pension-engine.test.mjs`

Empfehlung: Vor dem Löschen der `.test.mjs` entweder die Tests auf die
portierten `lib/engine/*.ts` umziehen, oder die Tests behalten. Die reinen
`*-engine.mjs`-Quellen sind ohne die Tests bedenkenlos löschbar.

## 6. Duplizierte PDF-Quelle (Root `documents/templates/`) — löschbar

- `documents/templates/*.pdf` — **DUPLIKAT** von `public/documents/templates/*.pdf`.
  Der DocumentBuilder lädt zur Laufzeit ausschliesslich aus `public/documents/templates/`.
  Nur die Root-Quelle ist löschbar; die `public/`-Kopie MUSS bleiben.

---

## Zusammenfassung

- **Sicher löschbar (nach Go):** 25 HTML + 17 JS + 14 CSS + 3 Legacy-Assets + `assets/risk/` (Root-Duplikat) + 3 Engine-`.mjs` + `documents/templates/` (Root-Duplikat)
- **Mit Bedacht:** 3 Engine-`.test.mjs` (vorher Tests portieren oder bewusst behalten)
- **Niemals löschen:** `public/assets/risk/`, `public/documents/templates/`, `lib/engine/*.ts`, gesamte `app/`, `components/`, `lib/`

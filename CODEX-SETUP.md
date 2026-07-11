# 🤖 Codex Setup — Pair Programming mit Claude

## 🎯 Deine Mission
Vervollständige die JavaScript-Logik, State Management und Interaktionen für Combinvest.

## 📦 Was ist schon fertig (von Claude)

✅ **HTML-Struktur** — Alle 6 Seiten sind fertig
✅ **CSS-Design** — Royal-Blau Branding, responsive, animations ready
✅ **Engines** — Pension & Affordability Engines (getestet, deterministic)
✅ **Types** — TypeScript Modell (types/combinvest.ts)

## 🔧 Was du machen sollst

### 1. **Wizard-Logik** (analyse.html)
- **Aufgabe:** 19 Fragen durchzappen, State speichern, Tacho-Ringe live updaten
- **Input:** Fragen-Array, Antworten
- **Output:** CustomerProfile mit Relevanz-Scores (0-5) für 8 Bereiche
- **Wichtig:** Live-Berechnung bei jedem Klick (nicht erst am Ende)

### 2. **PDF-Export** (am Ende von Step 3)
- **Aufgabe:** Beratungsprotokoll als PDF generieren
- **Inhalt:** Profil + Answers + Empfehlungen + Scores
- **Library:** pdfkit oder html2pdf (deine Wahl)

### 3. **Daten-Persistierung**
- **Aufgabe:** CustomerProfile im localStorage speichern (optional: IndexedDB)
- **Ziel:** Nutzer kann Session fortsetzen, nicht jedes mal neu anfangen

### 4. **State Management**
- **Aufgabe:** Zentraler State für alle 3 Steps
- ```javascript
  {
    basisdaten: {...},        // Name, DOB, etc
    modules: {                // 8 Module mit Relevanz
      pensiongap: {...},
      investment: {...},
      // etc
    },
    step: 1,                  // Welcher Step gerade aktiv
    notizen: [],              // Notiz-Panel
  }
  ```

### 5. **Relevanz-Engine** (für Tacho-Ringe)
- **Aufgabe:** Aus 19 Antworten → Scores für 8 Bereiche berechnen
- **Beispiel-Logik:**
  ```
  health = 2 (base)
        + (alter > 50 ? 1 : 0)
        + (raucher ? 1 : 0)
        - (sport_regelmaessig ? 1 : 0)
        + (kinder ? 1 : 0)
        => max 5 (SEHR HOCH)
  ```
- **Ziel:** Live-Update beim Klick (CSS @property --p animiert automatisch)

## 🎨 Frontend-Struktur (was du bekommst)

**HTML-Elemente, die du steuern wirst:**
```html
<!-- Step 1: Wizard -->
<div id="qTitle">           <!-- Frage-Titel -->
<div id="qSub">             <!-- Frage-Beschreibung -->
<div id="answers">          <!-- Antwort-Buttons hier rein -->
<div id="pText">1/19</div>   <!-- Progress Text -->
<div id="tachos">           <!-- 8 Tacho-Ringe hier rein -->

<!-- Step 2: Vertragscheck -->
<div id="prodgrid">         <!-- Produkte zum Anwählen -->
<div id="rows">             <!-- Erfasste Verträge -->

<!-- Step 3: Risikoanalyse -->
<div id="themes">           <!-- 8 Theme-Tiles (sorted by score) -->
```

## 📋 Wichtige Dateien für dich

```
/types/combinvest.ts        ← Typ-Definitionen (lies zuerst!)
/docs/riskine-combinvest-blueprint.md ← Spezifikation
/analyse.html               ← Deine Hauptbaustelle (Step 1-3)
/engine/pension-engine.mjs  ← Du brauchst diese nicht zu ändern
```

## 🧪 Testing-Checklist

Bevor du commitest, checke:
- [ ] Alle 19 Fragen funktionieren (click → next)
- [ ] Tacho-Ringe updaten live (CSS animation smooth)
- [ ] Vertragscheck speichert Produkte
- [ ] Step 3 zeigt 8 Tiles sortiert nach Score (hoch → tief)
- [ ] Browser-Console: keine errors
- [ ] Responsive (Desktop + Tablet + Mobile)

## 🔄 Workflow

1. **Pull** vom main (`git pull origin main`)
2. **Branch** erstellen: `git checkout -b feature/codex-wizard-logic`
3. **Code** schreiben + testen
4. **Commit** mit klarem Message: `Add: Wizard State Management + Live Tacho-Update`
5. **Push** zu deinem Branch: `git push -u origin feature/codex-wizard-logic`
6. **Tell Claude:** "Ich habe die Wizard-Logik gepusht — check doch sync!"
7. **Claude pullst**, testet, gibt Feedback
8. **Iterate** bis fertig

## 📞 Wenn du stuck bist

- **Types unklar?** → Lies `types/combinvest.ts` Zeile-für-Zeile
- **Relevanz-Engine?** → Schau die Blueprint-Logik in Claude's Kommentar
- **HTML-Struktur?** → Open `analyse.html` im Browser, inspect elements

---

**Ready?** Clone → branch → code → push → tell Claude!

🚀 Let's build this together!

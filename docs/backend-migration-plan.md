# Backend- und Riskine-Migrationsplan

## Sicherheitsprinzip

Der Metabase-Export bleibt unverändert und wird nie in Git eingecheckt. Der erste Schritt ist immer ein aggregierter, personenbezugsfreier Profilbericht. Erst nach bestätigter ID-Zuordnung werden Datensätze in ein Zielsystem geschrieben.

## Zeitliche Reihenfolge

1. Jahrgang 2026 technisch prüfen.
2. Falls leer, Jahrgang 2025 prüfen und als ersten echten Pilot verwenden.
3. Zwanzig repräsentative Kunden in einer isolierten Testdatenbank migrieren.
4. Zuordnung gegen Catalyst stichprobenartig bestätigen.
5. Erst danach ältere Jahrgänge rückwärts bearbeiten.

Das Jahr wird anhand von `Created At` bestimmt, nicht anhand des Downloadzeitpunkts des Exports.

## Identitäten

| Neue Bedeutung | Riskine/Metabase-Feld | Regel |
| --- | --- | --- |
| Legacy-Datensatz | `ID` | unverändert und eindeutig aufbewahren |
| Catalyst-Kunde | `Client ID` | vor Import gegen Catalyst bestätigen |
| Externe Analyse | `External ID` | als externe Analyse-ID aufbewahren |
| Riskine-Partei | `Data → Input → Party ID` | zusätzliche Referenz, niemals als Kunden-ID erraten |
| Riskine-Beratung | `Data → Input → Advice → ID` | zusätzliche Referenz pro Analyse |

## Vorgesehenes Backend-Modell

- `customers`: interne ID und bestätigte Catalyst-Kunden-ID
- `analyses`: Beratung, Status, Berater, Kunde, Schema-Version und Zeitstempel
- `analysis_revisions`: versionierte Zustände für Autosave und Wiederaufnahme
- `external_ids`: alle IDs aus Catalyst und Riskine mit Herkunft
- `legacy_imports`: Importlauf, Prüfsumme und Ergebnis
- `legacy_records`: unveränderter Original-Payload mit Zugriffsschutz
- `audit_log`: wer hat wann welche Analyse gelesen oder geändert

## CRM-Ablauf

Catalyst öffnet keine frei manipulierbare `customerId`-URL. Es erzeugt einen kurzlebigen signierten Startkontext. Das Backend prüft Berater und Kundenberechtigung, lädt den letzten Entwurf oder erzeugt eine neue Analyse. Änderungen werden automatisch als Revision gespeichert. Beim Abschluss erhält Catalyst Status, Zusammenfassung und einen stabilen Link zur Analyse.

## Profiler ausführen

```powershell
node tools/migration/profile-riskine-export.mjs "C:\Pfad\export.json" --year 2026
```

Der Bericht wird unter `reports/migration/` erzeugt und enthält keine Kunden- oder Datensatzwerte.

## Mapping prüfen

Das versionierte Feldmapping liegt in `tools/migration/riskine-v1.mapping.json`. Die Abdeckung eines Jahrgangs kann geprüft werden, ohne Feldwerte auszugeben:

```powershell
node tools/migration/check-riskine-mapping.mjs "C:\Pfad\export.json" 2026
```

Felder der Klassen `personal`, `financial` und `sensitive` dürfen später nur berechtigten Beratern zugänglich sein. Die endgültige Zuordnung von Legacy-Zahlenwerten zu Auswahloptionen (`legacy-enum`) erfolgt erst nach fachlicher Prüfung; sie wird nicht geraten.

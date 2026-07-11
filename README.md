# ComInvest Advisory Engine

Lokale, eigenständige Beratungsoberfläche für Schweizer Finanz-, Vorsorge- und Versicherungsthemen.

## Einstieg

`index.html` ist die Startseite. Von dort führt der Button **Finanzstatus Check starten** in `analyse.html`.

Die Hauptanalyse besteht aus drei Phasen:

1. persönliche Ausgangslage und Themenprioritäten
2. Überblick über bestehende Verträge
3. priorisierte Ergebnisübersicht inklusive Druckansicht

## Aktueller Stand

- `analyse.html` ist die aktive, von Codex überarbeitete Hauptversion.
- `analyse-claude-legacy.html` bleibt als Sicherung des bisherigen Claude-Entwurfs erhalten.
- Die eigenständigen Rechner bleiben über `index.html` erreichbar.

## Lokal starten

```powershell
& 'C:\Users\ermis\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 3000
```

Danach `http://127.0.0.1:3000` im Browser öffnen.

## Weiterer Ausbau

1. Analysewerte mit den Engines in `engine/` verbinden.
2. Vertragsdaten dauerhaft über ein Backend oder eine sichere Kundensitzung speichern.
3. Themenseiten mit konkreten, nachvollziehbaren Handlungsschritten verknüpfen.
4. CI, Tests und Deployment für die produktive Nutzung ergänzen.

> Die aktuelle Version ist ein Beratungsprototyp. Fachliche Regeln, Produktempfehlungen und Datenschutz müssen vor einem produktiven Einsatz geprüft und freigegeben werden.

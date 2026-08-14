# Catalyst-Integration — Vertrag v1

Dieses Dokument beschreibt den **implementierten und gegen eine laufende
Instanz getesteten** Stand, nicht einen Plan. Jeder Endpunkt und jeder Header
unten wurde per Ende-zu-Ende-Durchlauf verifiziert.

Rollenverteilung: **Catalyst ist der fuehrende Kundenstamm**, Combinvest ist
das Analyse-Werkzeug. Combinvest zieht keine Daten aus Catalyst; Catalyst
uebergibt sie beim Start der Sitzung. Das vermeidet eine Abhaengigkeit von
Catalyst-Leseschnittstellen, die es heute nicht gibt.

## Ablauf

1. Berater klickt in Catalyst im Reiter *Datenerhebungen* auf **Plus**.
2. Catalyst ruft **serverseitig** `POST /api/integration/v1/sessions` auf und
   erhaelt einen einmalig verwendbaren Deep-Link.
3. Catalyst leitet den Browser des Beraters auf diesen Link.
4. Combinvest verifiziert das Token, melde­t den Berater per E-Mail-Zuordnung an
   und oeffnet die Analyse.
5. Bei Meilensteinen sendet Combinvest einen signierten **Ping** an
   `callbackUrl` — ohne Fachdaten.
6. Catalyst holt den Stand per `GET /api/integration/v1/sessions/{externalId}`.

Der Ping traegt bewusst keine Personendaten: so entstehen keine PII in
Webhook-Logs oder Retry-Queues, und Catalyst bestimmt selbst, wann es liest.

## 1. Sitzung anlegen

```http
POST /api/integration/v1/sessions
Authorization: Bearer <CATALYST_INBOUND_TOKEN>
Content-Type: application/json

{
  "externalId": "catalyst-datenerhebung-123",
  "callbackUrl": "https://catalyst.example/api/combinvest/callback",
  "contact":  { "id": "<Catalyst-clientId>", "firstName": "…", "lastName": "…" },
  "advisor":  { "email": "berater@combinvest.swiss", "sellerId": "…" }
}
```

Antwort `200`:

```json
{
  "url": "https://analyse.example/api/integration/enter?token=…",
  "externalId": "catalyst-datenerhebung-123",
  "analysisId": "08fe203b-…",
  "customerId": "9d35025d-…",
  "expiresAt": "2026-08-14T13:21:29.680Z",
  "contractVersion": "v1"
}
```

- **Idempotent ueber `externalId`.** Ein zweiter Aufruf mit gleicher
  `externalId` liefert dieselbe `analysisId` und ein *neues* Token; das alte
  wird dadurch entwertet. Ein Doppelklick in Catalyst erzeugt also keine
  zweite Analyse.
- `advisor.email` muss der E-Mail des Beraters in Combinvest entsprechen —
  das ist die einzige Verknuepfung der Identitaeten.
- `contact.id` wird als `catalyst_client_id` am Kunden gespeichert und dient
  dem Wiedererkennen bei Folgeanalysen.

Fehler: `401` (Token falsch/fehlt), `422` (Validierung), `404` wenn die
Integration nicht aktiviert ist.

## 2. Deep-Link-Einstieg

```http
GET /api/integration/enter?token=<token>
```

`307` auf `/analyse/{analysisId}`, setzt eine regulaere Supabase-Session.

Das Token ist **einmalig** verwendbar und laeuft nach
`CATALYST_DEEPLINK_TTL_MINUTES` (Standard 30) ab. In der Datenbank liegt nur
ein Hash, nie das Token selbst. Fehlerfaelle leiten auf
`/login?integration_error=<grund>` mit den Gruenden `token_fehlt`,
`token_ungueltig`, `token_ersetzt`, `token_verbraucht`, `token_abgelaufen`,
`sitzung_unbekannt`, `analyse_fehlt`, `berater_unbekannt`,
`anmeldung_fehlgeschlagen`.

Es gibt keinen Sonder-Auth-Pfad: intern wird ein Magic-Link serverseitig
erzeugt und direkt eingeloest, der Berater erhaelt eine normale Session.

## 3. Rueckkanal (Ping an Catalyst)

Combinvest sendet `POST` an die bei der Sitzung angegebene `callbackUrl`:

```http
POST <callbackUrl>
Content-Type: application/json
X-Combinvest-Signature: <hex>
X-Combinvest-Timestamp: <ms-epoch>
X-Combinvest-Event: opened | saved | completed
X-Combinvest-Contract: v1

{
  "externalId": "catalyst-datenerhebung-123",
  "event": "opened",
  "analysisId": "08fe203b-…",
  "revision": 1,
  "occurredAt": "2026-08-14T12:57:36.853Z",
  "contractVersion": "v1"
}
```

**Signaturpruefung (verbindlich):**

```
signature = HMAC_SHA256(CATALYST_WEBHOOK_SECRET, "{X-Combinvest-Timestamp}.{roher Body}")
```

Hex-kodiert, zeitkonstant vergleichen. Der **rohe** Body muss geprueft werden,
nicht ein neu serialisiertes JSON — sonst schlaegt die Signatur fehl.
`X-Combinvest-Timestamp` sollte gegen ein Zeitfenster (z. B. 5 Minuten)
geprueft werden, um Replays auszuschliessen.

Zustellung ist **best effort**: ein nicht erreichbares Catalyst blockiert die
Beratung nie. Versuche und Fehler werden in `catalyst_sessions`
(`notify_attempts`, `last_notified_at`, `last_error`) protokolliert. Catalyst
sollte den Endpunkt idempotent halten und sich auf `revision` verlassen, nicht
auf die Reihenfolge der Zustellung.

## 4. Stand abholen (Pull)

```http
GET /api/integration/v1/sessions/{externalId}
Authorization: Bearer <CATALYST_INBOUND_TOKEN>
```

Liefert `status`, `revision`, `advisor`, die Antworten (`input`), das Ergebnis
(`result` mit `progressPercent`, `needScore`, `prioritization`), `notes`,
`contracts`, `closing` sowie `report` inkl. Download-URL. `401` ohne Token,
`404` bei unbekannter `externalId`.

## Umgebungsvariablen

| Variable | Zweck |
| --- | --- |
| `CATALYST_INTEGRATION_ENABLED` | Muss exakt `true` sein, sonst antworten alle Endpunkte mit `404`. |
| `CATALYST_INBOUND_TOKEN` | Bearer-Token, das Catalyst sendet. Min. 20 Zeichen. |
| `CATALYST_WEBHOOK_SECRET` | HMAC-Secret des Rueckkanals. Min. 20 Zeichen. |
| `CATALYST_DEEPLINK_SECRET` | Secret der Deep-Link-Tokens; faellt auf `CATALYST_WEBHOOK_SECRET` zurueck. |
| `CATALYST_DEEPLINK_TTL_MINUTES` | Optional, Standard `30`. |
| `CATALYST_APP_URL` | Optional. Basis-URL im zurueckgegebenen Deep-Link; sonst `NEXT_PUBLIC_APP_URL` bzw. die Vercel-URL. |

Ein halb konfiguriertes Deployment gilt als **nicht aktiv**: fehlen Secrets
oder sind sie zu kurz, bleiben die Endpunkte geschlossen. So kann der Code
deployed werden, bevor Catalyst bereit ist.

## Bonus: Uebernahme aus alten Riskine-Analysen

Optional kann bei `POST /sessions` ein `legacy`-Block mitgegeben werden:

```json
"legacy": {
  "recordId": "riskine-rec-2",
  "input": { "person.birthdate": "1985-04-12", "person.children": 2 }
}
```

Riskine benutzte flache Punkt-Schluessel, teils mit **undokumentierten
numerischen Options-Codes** (z. B. `person.education.level: 3`). Diese Codes
waren Indizes in Riskine-eigene Optionslisten und lassen sich nicht zuverlaessig
zuordnen. Deshalb gilt:

- Uebernommen werden nur **eindeutige** Werte: Geburtsdatum → Alter,
  Bruttoeinkommen, Kinderanzahl, Fahrzeugbesitz sowie textuelle Stammdaten.
- Undurchsichtige Enum-Codes werden **nicht geraten**, sondern unter
  `latestSnapshot.legacyImport.unmapped` protokolliert.
- Bereits vorhandene Antworten werden nie ueberschrieben — der Berater
  gewinnt immer gegen den Import.

Falsch geratene Kundendaten waeren schlimmer als eine leere Frage: der Berater
wuerde sie ungeprueft uebernehmen. Sobald echte Riskine-Exporte mit
Optionslisten vorliegen, koennen die Enum-Tabellen in
`lib/integration/catalyst/legacy-riskine.ts` ergaenzt werden.

## Offene Punkte fuer Catalyst

- Verbindliche `callbackUrl` je Umgebung (Produktion/Test).
- Austausch von `CATALYST_INBOUND_TOKEN` und `CATALYST_WEBHOOK_SECRET`
  ueber einen sicheren Kanal, nicht per Chat oder Ticket.
- Bestaetigung, dass die Berater-E-Mail in beiden Systemen identisch ist.
- Optional: Uebergabe von Vertraegen und Beziehungen im `contact`-Block,
  falls Catalyst diese beim Start bereitstellen kann.

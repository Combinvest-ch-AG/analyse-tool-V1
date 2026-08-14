# Devin-Auftrag: Catalyst-Seite der Analyse-Tool-Integration

Dieses Dokument ist der Arbeitsauftrag fuer die **Catalyst-Seite**. Die Seite des
Analyse-Tools (combinvest) ist fertig, verifiziert und aendert sich nicht.
Der Vertrag steht in `docs/catalyst-integration.md` — dort sind alle Endpunkte,
Header und Nutzlasten beschrieben. Dieses Dokument nennt nur, was **in Catalyst**
zu tun ist.

Repo: `Combinvest-ch-AG/catalyst`
Alle Pfade unten sind verifiziert (Stand der Analyse), nicht geraten.

### Umfang: ausschliesslich Code in diesem Repo

Nicht Teil dieser Aufgabe — bereits erledigt bzw. Sache des Betriebs:

- **Keine Env-Variablen setzen.** Die Werte liegen schon in den Render-Services
  (`combinvest-backend`, `dev-catalyst-backend`). Es werden nur die
  Config-Mappings im Code ergaenzt, die diese Variablen auslesen.
- **Kein Deployment, kein Render-Zugriff, keine Infrastruktur.**
- **Keine echten Tokens oder Secrets** anfordern, erzeugen, einsetzen oder
  ausgeben — auch nicht als Standardwert oder Testfixture.
- **Keine Aenderung am Analyse-Tool** (anderes Repo, fertig und verifiziert).
- **Kein Aufruf der echten Gegenseite** (`analyse.combinvest.swiss`) aus Tests.

Ergebnis ist ein Pull Request gegen den ueblichen Zielbranch, nicht ein
Direktpush.

---

## Grundsatz

Kein Big-Bang-Austausch von Riskine. Die Integration haengt sich an **genau zwei
bestehende Nahtstellen** und wird pro Mandant/Brand per Feature-Flag umgeschaltet.
Riskine bleibt lauffaehig, bis das Flag flaechendeckend an ist.

Frontend: **keine Aenderung**. Das Angular-Frontend
(`apps/frontend/angular-legacy`) ruft `analysisCreate` und `analysisOpenUrl` auf
und oeffnet die zurueckgegebene `url`. Beide Operationen behalten Signatur und
Rueckgabeform. Der Next.js-Pilot ist nicht im Einsatz und wird nicht angefasst.

---

## Nahtstelle 1 — Analyse eroeffnen

Datei: `apps/backend/packages/ci-backend/src/analyses-riskine/controller/gql-controller.ts`

Ist-Zustand (Zeile ~203):

```ts
export const analysisCreate: AnalysisCreateMutationResolver = async function analysisCreate(
  parent, args, context
) {
  const clientId = args.analysis.client_id;
  const callerSellerId = context.state.user.id;
  const redirectUrl = await riskineAnalysisService.getCreateNewAnalysisRedirectUrl(
    clientId, callerSellerId
  );
  return { url: redirectUrl };
};
```

Soll: vor dem Riskine-Aufruf verzweigen. Ist das Flag fuer den Mandanten aktiv,
statt Riskine den neuen Service rufen, der `POST /api/integration/v1/sessions`
gegen das Analyse-Tool ausfuehrt und dessen `url` zurueckgibt. Sonst unveraendert
Riskine.

`getAnalysisOpenUrl` (Zeile ~258) analog: liegt zur Analyse eine
`external_id` des Analyse-Tools vor, liefert der neue Service den Deep-Link;
sonst Riskine.

### Neuer Service

Neu: `apps/backend/packages/ci-backend/src/analyses-riskine/services/combinvest-analysis.ts`
(bewusst im bestehenden Modul, damit `analysisCreate` nicht umgebaut werden muss).

Aufgaben:
1. `clientCoreService.getById(clientId)` und `sellerCoreService.getById(callerSellerId)`
   laden — dieselben Services, die `getCreateNewAnalysisRedirectUrl` schon nutzt.
2. Nutzlast bauen und `POST /api/integration/v1/sessions` senden. `contact.id` ist
   die Catalyst-`clients.id` **als String**, `advisor.email` die
   `sellers.email`. Feldliste: `docs/catalyst-integration.md`.
3. `externalId` selbst vergeben (z. B. `catalyst:<clientId>:<uuid>`) und
   persistieren — siehe Persistenz unten.
4. Antwort-`url` zurueckgeben.

Wichtig: **`externalId` ist der Idempotenzschluessel.** Zweimal dieselbe
`externalId` liefert dieselbe `analysisId` und einen frischen Deep-Link-Token.
Fuer "neue Analyse zum selben Kontakt" also eine **neue** `externalId` vergeben,
fuer "bestehende Analyse erneut oeffnen" die **gespeicherte** wiederverwenden.

Timeouts/Ausfall: schlaegt der Aufruf fehl, `EntityError` mit klarer Meldung
werfen. Nicht still auf Riskine zurueckfallen — das wuerde zwei parallele
Analysen zum selben Kontakt erzeugen.

### Persistenz

Neue Migration unter `apps/backend/packages/ci-backend/migrations/steps/`.
Neue Tabelle `combinvest_analyses` (kein Umbau der Riskine-Tabellen):

| Spalte | Zweck |
| --- | --- |
| `id` | PK |
| `external_id` | unique, Korrelationsschluessel zum Analyse-Tool |
| `client_id` | FK auf `clients` |
| `seller_id` | FK auf `sellers`, eroeffnender Berater |
| `analysis_id` | UUID des Analyse-Tools (aus der Antwort) |
| `status` | `pending`/`opened`/`saved`/`completed`, als CHECK-Constraint, **kein** native ENUM |
| `last_event_at` | Zeitstempel des letzten Rueckkanal-Ereignisses |
| `created_at`/`updated_at` | Standard |

Damit `getAnalysisOpenUrl` und die Liste einen Wiedereinstieg finden.

---

## Nahtstelle 2 — Rueckkanal empfangen

Neuer REST-Endpunkt, passend zum bestehenden Muster in
`apps/backend/packages/ci-backend/src/analyses-riskine/controller/rest-controller.ts`.

Empfaengt die Ereignisse `analysis.opened` / `analysis.saved` /
`analysis.completed`. Reihenfolge zwingend:

1. **Signatur zuerst pruefen, ueber den Rohkoerper.** HMAC-SHA256 ueber
   `` `${timestamp}.${rawBody}` ``, Secret = gemeinsames Webhook-Secret.
   Header: `X-Combinvest-Signature` (hex), `X-Combinvest-Timestamp`,
   `X-Combinvest-Event`. Vergleich **timing-safe** (`crypto.timingSafeEqual`).
   Body erst nach erfolgreicher Pruefung parsen — ein JSON-Parse vor der
   Signaturpruefung ist eine offene Flanke.
2. Zeitstempel-Fenster pruefen (5 Minuten) → Replay-Schutz.
3. `external_id` in `combinvest_analyses` auflösen. Unbekannt → 404, nicht 500.
4. `status`/`last_event_at` fortschreiben. **Idempotent**: dasselbe Ereignis
   zweimal darf keinen zweiten Datensatz und keine zweite Datei erzeugen.
5. Bei `analysis.completed` das PDF ablegen (unten).
6. Immer schnell mit 2xx antworten. Schwere Arbeit asynchron — das Analyse-Tool
   hat ein kurzes Timeout und wiederholt bei Fehlern.

Der Endpunkt muss **ohne Seller-Session** erreichbar sein (Maschine-zu-Maschine).
Er darf nicht hinter der normalen Seller-Auth-Middleware liegen; die Signatur
**ist** die Authentifizierung. Route entsprechend in der Auth-Konfiguration
ausnehmen.

---

## PDF am Kontakt ablegen

Wie von dir vorgegeben: die bestehende Dateiablage am Kontakt. Zwei Schritte,
beide Bausteine existieren bereits.

1. PDF von der `report.downloadUrl` aus dem Analyse-Tool laden.
   Diese URL ist **kurzlebig signiert (10 Minuten)** — sofort laden, nicht
   speichern und spaeter verwenden.
   Quelle: `GET /api/integration/v1/sessions/{externalId}` → `report.downloadUrl`.
   Sie steht auch im `analysis.completed`-Ereignis.

2. Hochladen und anhaengen:

```ts
// Datei in die Catalyst-Ablage -> liefert file_key
const [fileKey] = await interserviceFileApiClient.upload([
  { payload: pdfBuffer, name: 'analyse-beratungsprotokoll.pdf' }
]);

// Am Kontakt anhaengen
await attachmentService.addAttachments(
  { client_id: clientId },                       // ClippingObject
  [{
    file_key: fileKey,
    orig_filename: 'analyse-beratungsprotokoll.pdf',
    title: 'Analyse - Beratungsprotokoll',
    is_public: false,
    document_type_id: DOCUMENT_TYPE_ID.CONSULTATION_PROTOCOL, // 17
    document_date: new Date(),
    status_id: STATUS_ID.ACTIVE,                              // 2
  }],
  callerSeller
);
```

Verifizierte Referenzen:
- `InterserviceFileApiClient.upload(files): Promise<string[]>` in
  `apps/backend/packages/ci-file-storage-manager-node-client/src/interservice/index.ts`
- `AttachmentService.addAttachments(clippingObject, inputs, callerSeller, options?)` in
  `apps/backend/packages/ci-backend/src/attachments/services/attachment.ts`
- `ClippingObject` / `NewAttachmentInput` in
  `apps/backend/packages/ci-backend/src/attachments/services/attachment-validation.ts`
- `DOCUMENT_TYPE_ID.CONSULTATION_PROTOCOL = 17`, `STATUS_ID.ACTIVE = 2` in
  `apps/backend/packages/ci-backend/src/attachments/consts.js`

Hinweis zur Berechtigung: `addAttachments` validiert gegen einen `callerSeller`.
Im Webhook gibt es keine Session, also den in `combinvest_analyses.seller_id`
gespeicherten eroeffnenden Berater laden und als `callerSeller` uebergeben.
Keinen Admin-Bypass einbauen — sonst umgeht die Ablage die Rollenpruefung.

Ersetzt ein spaeteres `completed` ein vorhandenes PDF, `addOrUpdateAttachmentsByEntityId`
statt `addAttachments` nutzen, damit keine Dubletten entstehen.

---

## Konfiguration in Catalyst

Nicht `process.env` direkt im Code lesen. Dieses Repo nutzt `node-config`: Werte
werden in `apps/backend/packages/ci-backend/config/*.js` gemappt und im Code mit
`config.get('combinvest.…')` gelesen — genau wie der bestehende `riskine`-Block
(`config/default.js:265`).

### Mandantentrennung: die Konfiguration MUSS fail-closed sein

Diese Integration ist nur fuer **zwei** Deployments vorgesehen: den produktiven
Mandanten `combinvest` (Render-Service `combinvest-backend`, `NODE_ENV=prod` →
`prod.js`) und die Testumgebung `dev-catalyst` (Service
`dev-catalyst-backend`, `NODE_ENV=staging` → `staging.js`).

Entscheidend: `prod.js` ist **dieselbe Datei fuer alle Mandanten**. Der Mandant
ergibt sich allein daraus, welche Env-Variablen im jeweiligen Render-Service
gesetzt sind. Ein Muster wie `isDisabled: process.env.X_DISABLE === 'true'`
(so macht es `riskine`) waere hier deshalb **falsch**: bei jedem anderen
Mandanten ist `X_DISABLE` nicht gesetzt, `isDisabled` wuerde `false` — die
Integration also **aktiv**, aber ohne URL und Token. Ergebnis: fehlerhafte
Aufrufe in fremden Mandanten.

Der Schalter wird daher aus dem **Vorhandensein der Konfiguration** abgeleitet.
Kein Mandant kann die Integration versehentlich aktiv haben:

```js
// config/default.js — Basis, gilt fuer alle Umgebungen
combinvest: {
  isDisabled: true,
  baseUrl: '',
  inboundToken: '',
  webhookSecret: ''
},
```

```js
// config/prod.js UND config/staging.js — identischer Block
combinvest: {
  // Aktiv nur, wenn alle drei Werte vorhanden sind und nicht bewusst
  // abgeschaltet wurde. Fehlt etwas, bleibt die Integration aus.
  isDisabled:
    process.env.COMBINVEST_ANALYSIS_DISABLE === 'true' ||
    !process.env.COMBINVEST_ANALYSIS_BASE_URL ||
    !process.env.COMBINVEST_ANALYSIS_INBOUND_TOKEN ||
    !process.env.COMBINVEST_ANALYSIS_WEBHOOK_SECRET,
  baseUrl: process.env.COMBINVEST_ANALYSIS_BASE_URL,
  inboundToken: process.env.COMBINVEST_ANALYSIS_INBOUND_TOKEN,
  webhookSecret: process.env.COMBINVEST_ANALYSIS_WEBHOOK_SECRET
},
```

In `dev-local.js` und `dev-docker.js` denselben Block mit `isDisabled: true` und
leeren Werten ergaenzen, damit `config.get('combinvest.…')` in allen Umgebungen
existiert und lokale Laeufe nie nach aussen telefonieren.

Bei `isDisabled === true` verhaelt sich Catalyst so, als gaebe es die
Integration nicht: kein Umschalten in `analysisCreate`, der bestehende
Riskine-Pfad laeuft unveraendert weiter.

| Env-Variable | Config-Key | Inhalt |
| --- | --- | --- |
| `COMBINVEST_ANALYSIS_BASE_URL` | `combinvest.baseUrl` | Basis-URL des Analyse-Tools, ohne Slash am Ende |
| `COMBINVEST_ANALYSIS_INBOUND_TOKEN` | `combinvest.inboundToken` | Bearer-Token fuer ausgehende Aufrufe |
| `COMBINVEST_ANALYSIS_WEBHOOK_SECRET` | `combinvest.webhookSecret` | HMAC-Secret zur Pruefung eingehender Ereignisse |
| `COMBINVEST_ANALYSIS_DISABLE` | `combinvest.isDisabled` | Optionaler Not-Aus: `'true'` schaltet ab, auch wenn alles gesetzt ist |

Die drei Werte muessen **zeichengleich** mit der Gegenseite sein: `inboundToken`
== `CATALYST_INBOUND_TOKEN`, `webhookSecret` == `CATALYST_WEBHOOK_SECRET` im
Analyse-Tool. Ein Tippfehler ergibt 401 beim Oeffnen bzw. verworfene Ereignisse.

### Secrets und Devin

Die echten Werte sind bereits in den Render-Services hinterlegt und gehoeren
**nicht** in diese Aufgabe. Zum Schreiben und Testen des Codes werden sie nicht
gebraucht:

- Niemals echte Tokens oder Secrets in Devin, ins Repo, in Tests oder in Logs.
- Fuer lokale Laeufe und Unit-Tests Platzhalter verwenden (z. B.
  `COMBINVEST_ANALYSIS_INBOUND_TOKEN=dummy-token`) oder das Modul mocken.
- Es wird **kein** `COMBINVEST_ANALYSIS_*`-Wert im Code hart hinterlegt, auch
  kein Standardwert.
- Das Deep-Link-Secret des Analyse-Tools (`CATALYST_DEEPLINK_SECRET`) wird auf
  Catalyst-Seite nicht benoetigt und darf dort nicht gesetzt werden.

Wenn Tests eine laufende Gegenseite brauchen: die Antworten des Analyse-Tools
mocken. Kein Test darf gegen `analyse.combinvest.swiss` laufen.

Token und Secret sind Geheimnisse: nur ueber die bestehende Secret-Verwaltung,
nie ins Repo, nie in Logs. In Fehlermeldungen weder Token noch Signaturen
ausgeben.

---

## Abnahmekriterien

1. Flag aus → Verhalten unveraendert, Riskine wie bisher. Keine Regression.
2. Flag an, "Analyse erstellen" in Angular → Analyse-Tool oeffnet, Berater ist
   angemeldet, Kontaktdaten sind vorbefuellt.
3. Analyse abschliessen → `analysis.completed` kommt an, PDF liegt als
   Beratungsprotokoll am Kontakt.
4. Dasselbe Ereignis zweimal zugestellt → genau ein Anhang, kein Duplikat.
5. Ereignis mit falscher Signatur → 401, keine Datenaenderung.
6. Ereignis mit Zeitstempel aelter als 5 Minuten → abgewiesen.
7. Analyse-Tool nicht erreichbar → verstaendlicher Fehler im UI, keine
   Geisteranalyse in Catalyst.
8. Bestehende Analyse erneut oeffnen → dieselbe Analyse, nicht eine neue.

---

## Zwei Befunde am Rand

Beim Lesen des Bestandscodes aufgefallen, **nicht** Teil dieses Auftrags —
bitte separat bewerten, nicht nebenbei mitaendern:

1. In `getCreateNewAnalysisRedirectUrl`
   (`services/riskine-analysis.ts`) ist die Riskine-Vorbefuellung vertauscht:
   `person.advisor.first-name` / `person.advisor.last-name` werden mit
   **Client**-Daten gefuellt, `person.name.first` / `person.name.last` mit
   **Seller**-Daten. Nach Riskines Namensschema ist das genau verdreht.
2. Ebenda: `person.advisor.address.house-number` erhaelt
   `client.primaryAddress?.address`, also dieselbe Strasse wie
   `...address.street`, statt der Hausnummer.

Beides betrifft nur den Riskine-Pfad. Die neue Integration nutzt die
Catalyst-Felder direkt und ist davon nicht betroffen.

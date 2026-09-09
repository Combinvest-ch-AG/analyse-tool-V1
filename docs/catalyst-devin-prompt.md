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

- **Keine Env-Variablen in Render setzen.** Die Werte liegen dort bereits
  (`combinvest-backend`, `dev-catalyst-backend`). Im Code werden nur die
  Config-Mappings ergaenzt, die diese Variablen auslesen. In der **eigenen**
  Arbeitsumgebung werden Variablen dagegen gesetzt — siehe „Testen gegen
  Produktion".
- **Kein Deployment, kein Render-Zugriff, keine Infrastruktur.**
- **Keine Secrets im Repo, in Tests, in Commits, in Logs oder in der
  PR-Beschreibung** — auch nicht als Standardwert oder Testfixture. Werte
  kommen ausschliesslich aus der Umgebung.
- **Keine Aenderung am Analyse-Tool** (anderes Repo, fertig und verifiziert).

Ausdruecklich **doch** Teil der Aufgabe, obwohl es geteilten Code beruehrt: die
`trustedSource`-Erweiterung in `attachments/services/attachment-validation.ts`
und im `Options`-Typ (siehe „Vorgabe: `ACTIVE`"). Das ist die einzige Stelle
ausserhalb der Integration, die geaendert wird — bewusst minimal, additiv und
mit Standardwert `false`, damit bestehendes Verhalten unveraendert bleibt.

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

Empfaengt die Ereignisse `opened` / `saved` / `completed` — so, ohne Praefix, im
Header `X-Combinvest-Event` und im Body-Feld `event`. Reihenfolge zwingend:

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
5. Bei `completed` das PDF ablegen (unten).
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
   Sie steht auch im `completed`-Ereignis.

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
    status_id: STATUS_ID.ACTIVE,                              // 2 — Vorgabe
  }],
  callerSeller,
  { returning: 'id', trustedSource: true }                    // siehe unten
);
```

Verifizierte Referenzen:
- `InterserviceFileApiClient.upload(files): Promise<string[]>` in
  `apps/backend/packages/ci-file-storage-manager-node-client/src/interservice/index.ts`
- `AttachmentService.addAttachments(clippingObject, inputs, callerSeller, options?)` in
  `apps/backend/packages/ci-backend/src/attachments/services/attachment.ts`
- `ClippingObject` / `NewAttachmentInput` in
  `apps/backend/packages/ci-backend/src/attachments/services/attachment-validation.ts`
- `DOCUMENT_TYPE_ID.CONSULTATION_PROTOCOL = 17`, `STATUS_ID.ACTIVE = 2`,
  `STATUS_ID.DRAFT = 1` in
  `apps/backend/packages/ci-backend/src/attachments/consts.js`

### Berechtigung: echte Rolle, kein Spoof

`addAttachments` prueft `callerSeller` an zwei Stellen
(`attachments/services/attachment-validation.ts`):

1. `validateCallerSellerRole` (Z. 122): `role_id` muss in
   `[ADMIN=6, BACKOFFICE=12, SALES_LEAD=5, SALES_FORCE=4]` liegen.
2. `validateAddAttachmentInput` (Z. 144): fuer die Sales-Rollen
   (`SALES_LEAD`, `SALES_FORCE`) zusaetzlich TC-778 — erlaubt sind nur
   `status_id: DRAFT` **und** `is_public: false`.
3. Getrennt davon `validateClippingObject` (Z. 187): Kundenzugriff ueber
   `rbacChecker`.

**Die echte Rolle des Beraters uebergeben. Nichts hochstufen:**

```ts
// seller_id UND role_id des eroeffnenden Beraters aus der eigenen Tabelle
// bzw. per sellerRepository.findById() laden
const callerSeller = { id: storedSellerId, role_id: seller.role_id };
```

Warum kein Spoof: `isAccessGranted` (Z. 205) leitet die `restrictions` aus dem
**uebergebenen** `role_id` ab. Ein hochgestuftes `role_id: ADMIN` liefert damit
leere bzw. unbeschraenkte `restrictions` — und `sellerPermissionCheck` laesst bei
leeren `restrictions` jeden Kontakt durch (kein `throw` am Ende der Funktion,
`rbac/rbac-checker.ts`). Der Spoof umgeht also **auch** die Kundenpruefung, nicht
nur die Statusregel. Mit der echten Rolle greift `onlyOwn` / `onlyOwnAndSub`
weiterhin, und ein Berater kann nur an eigenen (bzw. unterstellten) Kontakten
ablegen.

Kein technischer Sammel-User (etwa `SYSTEM_SELLER_IDS.THE_CATALYST`) als
`callerSeller`: dann verliert der Anhang die Zuordnung zum Berater, und die
Zugriffspruefung liefe gegen einen Seller, der den Kontakt gar nicht kennt.

### Vorgabe: `ACTIVE` — Statusregel per `trustedSource` erweitern

Das PDF wird als `STATUS_ID.ACTIVE` (2) abgelegt. Es ist ein vom System
erzeugtes, fertiges Beratungsprotokoll und kein Entwurf.

TC-778 (`attachment-validation.ts:77-84`) verbietet den Sales-Rollen
(`SALES_LEAD`, `SALES_FORCE`) aber genau das:

```ts
const newAttachmentsInputForSalesRolesValidator = Joi.array().items(
  Joi.object({ status_id: Joi.any().valid(STATUS_ID.DRAFT),
               is_public: Joi.any().valid(false) })
).min(1);
```

Die Regel adressiert **manuelle Uploads durch Berater**. Sie wird daher nicht
umgangen, sondern um einen ausdruecklichen Fall erweitert: Uploads aus einer
serverseitig authentifizierten Schnittstelle. Umsetzung in drei kleinen
Schritten:

**1. `Options` um ein Flag erweitern.** Den `Options`-Typ suchen (wird in
`services/attachment.ts` importiert, nicht dort definiert) und ergaenzen:

```ts
/**
 * Nur fuer serverseitig authentifizierte Schnittstellen (Signatur-geprueft).
 * Hebt ausschliesslich die TC-778-Statusregel auf. Rollen-Allowlist und
 * rbacChecker-Kundenpruefung bleiben unberuehrt.
 * Darf NIE aus HTTP-Eingaben gesetzt werden.
 */
trustedSource?: boolean;
```

**2. Flag in die Validierung durchreichen.** `addAttachments` (Z. 129) ruft
`validateAddAttachmentInput(callerSeller, newAttachmentsInput)` bisher ohne
`options` auf. Dritten Parameter ergaenzen und die Sales-Sonderregel
ueberspringen, wenn er gesetzt ist:

```ts
validateAddAttachmentInput(
  callerSeller: CallerSeller,
  newAttachmentsInput: NewAttachmentInput[],
  trustedSource = false
): ValidationResult {
  const callerSellerValidationResult = this.validateCallerSellerRole(callerSeller);
  if (callerSellerValidationResult.error) return callerSellerValidationResult;

  if (!trustedSource && this.salesRoles.includes(callerSeller.role_id)) {
    return newAttachmentsInputForSalesRolesValidator.validate(...);
  }
  return { value: newAttachmentsInput };
}
```

`validateCallerSellerRole` bleibt **vor** der Abfrage: die Rollen-Allowlist gilt
weiter. `validateClippingObject` (Z. 187) wird nicht angetastet: die
Kundenpruefung greift unveraendert.

**3. Update-Pfad ebenfalls beruecksichtigen** — sonst bricht ein zweites
`completed`. `validateUpdateAttachmentsInput` (Z. 154) erlaubt Sales-Rollen als
Ziel nur `DRAFT | ARCHIVED | DELETED` und verlangt zusaetzlich, dass der
**bestehende** Anhang `DRAFT` ist (Z. 174). Nach dem ersten `ACTIVE`-PDF wuerde
eine Ersetzung also doppelt scheitern. `trustedSource` daher auch dort
auswerten und ueber `addOrUpdateAttachmentsByEntityId` (Z. 598) an beide
Teilpfade weitergeben.

#### Warum das sicher ist — und was nachzuweisen ist

Beide oeffentlichen Aufrufer uebergeben `options` als **festes Literal**, nicht
aus dem Request:

- REST `controllers/controller.js:255` → `{ returning: 'id' }`
- GraphQL `controllers/graphql-controller.ts:103` → `{ returning: true }`

Ein Angreifer kann `trustedSource` also nicht ueber die HTTP-Schnittstelle
einschleusen. Das ist die tragende Annahme — sie ist per Test abzusichern:

1. Ein Test, der `trustedSource` in einer REST-/GraphQL-Nutzlast mitschickt und
   nachweist, dass eine Sales-Rolle damit **kein** `ACTIVE` erzeugen kann.
2. Ein Test, dass eine Sales-Rolle ohne Flag weiterhin auf `DRAFT` +
   `is_public: false` beschraenkt bleibt (TC-778 unveraendert).
3. Ein Test, dass mit Flag die Kundenpruefung weiter greift: fremder Kontakt →
   `EntityForbiddenError`.
4. Ein Test fuer das zweite `completed` (Ersetzung eines `ACTIVE`-Anhangs).

`is_public` bleibt in **allen** Faellen `false`. Das Flag lockert nur den Status.

#### Bewusste Folge im UI

`file-menu/file-menu.ts:96-133` bindet `canEdit`, `canDelete` und `canArchive`
fuer Nicht-Admin/BO an `DRAFT`; `canVerify` (Z. 104) ebenfalls. Ein
`ACTIVE`-Dokument kann ein normaler Berater daher nicht mehr aendern oder
loeschen, und es durchlaeuft keine Backoffice-Freigabe. Fuer ein maschinell
erzeugtes Protokoll ist das gewollt: es soll nicht von Hand editierbar sein.
Sichtbar ist es in jedem Fall — die Anhangliste fordert `status_id=1&status_id=2`
an (`multi-files-form.component.ts:98`), und im Lesepfad wird nur `DELETED`
ausgeschlossen (`repositories/attachment.ts:149,375`).

#### Wenn die Rolle nicht erlaubt ist

`COMBINVEST_ROLES` enthaelt weitere Verkaeufer-Rollen, u. a. `PARTNER = 3` und
`PARTNER_SELLER = 16`, die **nicht** in den vier erlaubten liegen. Fuer solche
Berater schlaegt die Ablage fehl — das ist die korrekte Rechtelage und wird
nicht umgangen. Behandlung:

- Fehler abfangen, damit der Webhook **nicht** 5xx zurueckgibt (sonst laufen die
  Zustellversuche der Gegenseite endlos).
- Mit `analysisId`, `sellerId` und `role_id` protokollieren, ohne Kundendaten.
- Ereignis trotzdem als verarbeitet markieren, aber `report_attachment_id` leer
  lassen, damit erkennbar ist, dass kein Anhang entstand.
- Das PDF ist nicht verloren: es bleibt ueber
  `GET /api/integration/v1/sessions/{externalId}` beim Analyse-Tool abrufbar.

**Bitte pruefen und im PR berichten:** welche Rollen koennen im Catalyst-UI
ueberhaupt eine Analyse eroeffnen? Liegen alle in den vier erlaubten, ist die
Luecke theoretisch. Liegen sie nicht darin, sag es — dann entscheiden wir
bewusst (z. B. Rollenliste per Config erweitern), statt still hochzustufen.

Ersetzt ein spaeteres `completed` ein vorhandenes PDF, `addOrUpdateAttachmentsByEntityId`
statt `addAttachments` nutzen, damit keine Dubletten entstehen.

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

---

## Testen gegen Produktion

Das Analyse-Tool ist unter `https://analyse.combinvest.swiss` **live und
erreichbar**. Gegen diese Instanz darf getestet werden. Die drei Werte werden in
der Devin-Arbeitsumgebung als Umgebungsvariablen gesetzt (Secrets-Verwaltung von
Devin, nicht als Klartext in Dateien):

```
COMBINVEST_ANALYSIS_BASE_URL     = https://analyse.combinvest.swiss
COMBINVEST_ANALYSIS_INBOUND_TOKEN  → wird bereitgestellt
COMBINVEST_ANALYSIS_WEBHOOK_SECRET → wird bereitgestellt
```

Ohne Slash am Ende der URL. Es wird **kein** Wert im Code hart hinterlegt, auch
kein Standardwert; `CATALYST_DEEPLINK_SECRET` wird auf Catalyst-Seite nicht
gebraucht.

### Erreichbarkeit pruefen, bevor irgendetwas gebaut wird

Erwartet: **422** (Route erreichbar, Token akzeptiert, Nutzlast unvollstaendig).
Dieser Aufruf schreibt nichts.

```bash
curl -i -X POST "$COMBINVEST_ANALYSIS_BASE_URL/api/integration/v1/sessions" \
  -H "Authorization: Bearer $COMBINVEST_ANALYSIS_INBOUND_TOKEN" \
  -H "Content-Type: application/json" -d '{}'
```

Deutung anderer Antworten — hier nicht weiterbauen, sondern melden:
`401` = Token stimmt nicht. `404` = Integration dort nicht aktiv.
Alles andere = Fehler auf der Gegenseite.

### Regeln fuer Laeufe gegen Produktion

Jeder erfolgreiche `POST /sessions` erzeugt in der Produktionsdatenbank des
Analyse-Tools eine **echte Analyse**. Deshalb:

1. **`externalId` immer mit `devin-test-` beginnen**, z. B.
   `devin-test-<uuid>`. Damit sind Testdaten erkennbar und entfernbar.
   (Mindestens 8, maximal 200 Zeichen.)
2. **Nur eigene Testkontakte** verwenden, niemals echte Kundendatensaetze.
3. **Sparsam**: die Erreichbarkeitspruefung und einige gezielte Laeufe, keine
   Schleifen und keine Lasttests.
4. **`callbackUrl` muss eine gueltige absolute URL sein.** Aus Devin heraus ist
   kein oeffentlicher Empfaenger erreichbar, darum eine bewusst nicht
   existierende URL angeben, z. B.
   `https://dev-catalyst.example.invalid/webhooks/combinvest`. Das Analyse-Tool
   protokolliert den fehlgeschlagenen Zustellversuch und bricht nichts ab.

### Was gegen Produktion getestet wird — und was nicht

Gegen die echte Instanz sinnvoll:
- Erreichbarkeit und Token (siehe oben)
- `POST /sessions` mit vollstaendiger Nutzlast → Antwortform, `url`, `analysisId`
- Idempotenz: zweimal dieselbe `externalId` → gleiche `analysisId`
- `GET /sessions/{externalId}` → Statusabfrage
- Fehlerfaelle: falscher Token → 401, unbekannte `externalId` → 404

Der **Rueckkanal wird nicht gegen Produktion getestet**, sondern lokal: die
Ereignisse `opened` / `saved` / `completed` werden mit dem Webhook-Secret
selbst signiert und an den eigenen Endpunkt geschickt. So sind Signaturpruefung,
Replay-Fenster, Idempotenz und PDF-Ablage vollstaendig pruefbar, ohne auf ein
echtes Ereignis zu warten. Signatur-Erzeugung fuer Tests:

```ts
const raw = JSON.stringify(payload);
const timestamp = Date.now().toString(); // MILLISEKUNDEN, wie die Gegenseite
const signature = crypto
  .createHmac('sha256', process.env.COMBINVEST_ANALYSIS_WEBHOOK_SECRET)
  .update(`${timestamp}.${raw}`)
  .digest('hex');
// Header: X-Combinvest-Signature, X-Combinvest-Timestamp, X-Combinvest-Event
```

Unit-Tests laufen ohne Netz mit Platzhaltern (z. B.
`COMBINVEST_ANALYSIS_WEBHOOK_SECRET=test-secret`) und gemockten Antworten —
CI darf nicht von einer externen Instanz abhaengen.

### Am Ende: Testdaten melden

Die verwendeten `devin-test-*`-`externalId`s in der PR-Beschreibung auflisten,
damit sie im Analyse-Tool entfernt werden koennen. Keine Tokens, keine
Signaturen, keine Kundendaten in die PR schreiben.

---

## Abnahmekriterien

1. Flag aus → Verhalten unveraendert, Riskine wie bisher. Keine Regression.
2. Flag an, "Analyse erstellen" in Angular → Analyse-Tool oeffnet, Berater ist
   angemeldet, Kontaktdaten sind vorbefuellt.
3. Analyse abschliessen → `completed` kommt an, PDF liegt als
   Beratungsprotokoll am Kontakt, Status `ACTIVE`, und ist in der Anhangliste
   des Kontakts sichtbar (mit einer Sales-Rolle geprueft, nicht als Admin).
4. Dasselbe Ereignis zweimal zugestellt → genau ein Anhang, kein Duplikat.
5. Ereignis mit falscher Signatur → 401, keine Datenaenderung.
6. Ereignis mit Zeitstempel aelter als 5 Minuten → abgewiesen.
7. Analyse-Tool nicht erreichbar → verstaendlicher Fehler im UI, keine
   Geisteranalyse in Catalyst.
8. Bestehende Analyse erneut oeffnen → dieselbe Analyse, nicht eine neue.

---

## Drei Befunde am Rand

Beim Lesen des Bestandscodes aufgefallen, **nicht** Teil dieses Auftrags —
bitte separat bewerten, nicht nebenbei mitaendern:

0. `external-integration/services/external-integration.ts:132` (`uploadContactFile`)
   setzt `role_id: COMBINVEST_ROLES.ADMIN` fuer einen beliebigen `sellerId`.
   Weil `isAccessGranted` die `restrictions` aus diesem `role_id` ableitet und
   `sellerPermissionCheck` bei leeren `restrictions` ohne `throw` durchlaeuft,
   entfaellt damit die Kontaktpruefung: das vorgeschaltete
   `validateSellerAndClient` prueft nur, dass Seller und Client **existieren**,
   nicht dass sie zusammengehoeren. Ueber diesen Weg kann eine Datei an einen
   fremden Kontakt gehaengt werden. Bitte als eigenen Sicherheitsbefund melden —
   dieses Muster ausdruecklich **nicht** kopieren.

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

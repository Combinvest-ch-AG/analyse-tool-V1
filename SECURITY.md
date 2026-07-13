# Sicherheitskonzept — Combinvest Advisory Engine

Combinvest ist eine **Client-only-Anwendung** (statische Seiten, kein Backend).
Alle Eingaben bleiben im Browser des Nutzers. Dieses Dokument beschreibt das
Bedrohungsmodell, die umgesetzten Schutzmassnahmen und ihre Grenzen.

## Bedrohungsmodell

| # | Bedrohung | Schutz | Status |
|---|-----------|--------|--------|
| 1 | Fremdes Auslesen der gespeicherten Daten (Klartext in localStorage) | AES-GCM-256-Verschlüsselung im Ruhezustand, Schlüssel nicht-extrahierbar in IndexedDB | ✅ |
| 2 | Einschleusen von fremdem JavaScript (XSS / CDN-Manipulation) | Strenge CSP (`script-src 'self'`), keine externen Skripte (d3 self-gehostet), Ausgabe-Escaping | ✅ |
| 3 | Clickjacking (Seite in fremdem iframe) | `frame-ancestors 'none'` + `X-Frame-Options: DENY` | ✅ |
| 4 | Daten-Exfiltration an fremde Server | `connect-src 'self'`, keine `fetch`/XHR im Code | ✅ |
| 5 | Abgreifen über unverschlüsselte Verbindung | `Strict-Transport-Security` (HSTS), `upgrade-insecure-requests` | ✅ (bei HTTPS-Hosting) |
| 6 | Zwischenspeicherung von PII in Shared-Caches | `Cache-Control: no-store` für alle HTML-Seiten | ✅ |
| 7 | `window.opener`-Übernahme bei externen Links | `rel="noopener"` auf allen `target="_blank"`-Links | ✅ |
| 8 | Zurückgelassene Daten auf geteiltem Gerät | TTL: Profil wird nach 90 Tagen automatisch verworfen + „Daten löschen"-Funktion | ✅ |
| 9 | Missbrauch von Browser-APIs (Kamera, Standort, …) | `Permissions-Policy` deaktiviert alle sensiblen Features | ✅ |

## Verschlüsselte Speicherung — `assets/combinvest-secure.js`

- **Algorithmus:** AES-GCM, 256 Bit, pro Schreibvorgang frischer 96-Bit-IV.
- **Schlüssel:** einmalig via WebCrypto erzeugt, `extractable: false`, dauerhaft
  in IndexedDB (`combinvest-secure`). Der Schlüssel verlässt den Browser nie und
  kann per JavaScript nicht ausgelesen werden.
- **Ablage:** ein einziger verschlüsselter Blob in localStorage
  (`combinvest.secure.v1`). Kein Klartext-PII mehr in localStorage.
- **Migration:** bestehende Klartext-Einträge (`combinvest.customerProfile.v1`,
  `combinvest.budget.v1`, …) werden beim ersten Laden entschlüsselt übernommen
  und der Klartext gelöscht.
- **TTL:** Daten älter als 90 Tage werden verworfen (Schutz auf geteilten Geräten).
- **Fallback:** Browser ohne WebCrypto/IndexedDB laufen weiter (gebündelte
  Ablage), verlieren aber die Verschlüsselung — `Combinvest.secure.encrypted`
  zeigt den Status.

### API (Claude UND Codex nutzen dieselbe)

```js
await Combinvest.ready;                 // einmalig auf Entschlüsselung warten
Combinvest.store.get(key);              // entschlüsselter String | null (sync)
Combinvest.store.set(key, jsonString);  // verschlüsselt persistieren
Combinvest.store.remove(key);
Combinvest.store.clearAll();            // alle PII löschen
```

## Ehrliche Grenzen (kein Overselling)

- Es ist eine **Client-only-App**: Wer die Seite im **selben Browserprofil**
  öffnet, kann die App die Daten wie vorgesehen entschlüsseln lassen. Die
  Verschlüsselung schützt gegen einfaches localStorage-Auslesen und
  Schlüssel-Extraktion, **nicht** gegen einen Angreifer mit voller Kontrolle
  über das entsperrte Gerät/Profil.
- Ohne echtes Backend gibt es **keine Server-Authentifizierung**. Für eine
  produktive Beratungslösung mit Mehrbenutzer-/Berater-Zugriff ist eine
  serverseitige, verschlüsselte Kundensitzung erforderlich (siehe Roadmap).
- Die `<meta>`-CSP ist Defense-in-Depth; die **verbindliche** CSP kommt über
  die HTTP-Header (`_headers` / `netlify.toml`) und braucht HTTPS-Hosting.

## Deployment-Anforderungen

1. **Nur über HTTPS** ausliefern (HSTS ist gesetzt).
2. `_headers` (Cloudflare/Netlify) bzw. `netlify.toml` mitdeployen, damit die
   Sicherheits-Header wirksam werden.
3. `security@combinvest.ch` als erreichbaren Kontakt einrichten
   (`.well-known/security.txt`).

## Roadmap (für produktiven Einsatz)

- [ ] Serverseitige, verschlüsselte Kundensitzung (Backend) statt Client-Storage
- [ ] Passphrase-abgeleiteter Schlüssel (PBKDF2/Argon2) für echte Nutzer-Bindung
- [ ] Audit-Log & Einwilligungs-Management (DSG/DSGVO)
- [ ] Subresource Integrity, sobald Assets über CDN ausgeliefert werden
- [ ] Automatisierter Security-Scan in CI (z. B. `npm audit`, CSP-Linter)

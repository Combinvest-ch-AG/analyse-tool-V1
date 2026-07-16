# Catalyst-Integration

## Bestätigter Einstieg

Die Catalyst-Kundenansicht verwendet eine URL nach dem Muster `/de/clients/{clientId}`. Die im Profil sichtbare ID entspricht dabei dem Pfadparameter. Im Reiter **Datenerhebungen** startet das Plus eine neue, explizit diesem Kunden zugeordnete Datenerhebung.

Die technische Integration soll diesen bestehenden Ablauf beibehalten:

1. Berater öffnet den Kunden in Catalyst.
2. Berater öffnet **Datenerhebungen** und klickt auf **Plus**.
3. Catalyst erzeugt serverseitig einen kurzlebigen, signierten Launch-Token.
4. Combinvest prüft Token, Beraterberechtigung, Kunden-ID und Mandant.
5. Combinvest lädt Basisdaten, Beziehungen, Verträge und Dateireferenzen.
6. Der Berater übernimmt oder korrigiert die vorbefüllten Werte.
7. Autosave speichert eine versionierte Analyse für genau diesen Kunden.
8. Nach Abschluss schreibt Combinvest Status, Zusammenfassung und Link nach Catalyst zurück.

## Launch-Request

```http
POST /api/integrations/catalyst/launch
Authorization: Bearer <kurzlebiger-signierter-token>
Content-Type: application/json

{
  "clientId": "<Catalyst-ID>",
  "action": "create-or-resume-analysis"
}
```

Eine Kunden-ID aus dem Querystring allein erteilt niemals Zugriff.

## Übernahme aus Catalyst

- **Basisdaten:** Name, Geburtsdatum, Telefon, E-Mail, Adresse und vorhandenes Einkommen.
- **Verträge:** Policennummer, Vertragsart, Gesellschaft, Bruttoprämie, Zahlungsintervall, Status, Bemerkung und Beginndatum.
- **Beziehungen:** Partner, Kinder und andere relevante Haushaltsbeziehungen als Referenzen.
- **Dateien/Bilder:** nur Metadaten und kurzlebige, autorisierte Abruf-URLs. Die Analyse speichert keine dauerhaften öffentlichen URLs.
- **Berechtigungen:** zuständiger Berater, Führungs-/Sachbearbeiterrechte und Mandant müssen serverseitig geprüft werden.

Alle importierten Werte tragen später Herkunft, Quell-ID und Abrufzeitpunkt. Der Kunde oder Berater kann vorbefüllte Angaben ändern; die Änderung überschreibt nicht den Originalwert, sondern erzeugt eine neue Analyse-Revision.

## Benötigte Catalyst-Schnittstellen

Für die Umsetzung benötigen wir API-Endpunkte oder Webhooks für:

- Kundenstammdaten lesen
- Verträge eines Kunden lesen
- Beziehungen lesen
- Dateien auflisten und autorisiert abrufen
- Datenerhebung anlegen/aktualisieren
- abgeschlossene Analyse oder PDF am Kunden ablegen
- aktuellen Benutzer und dessen Zugriffsrechte feststellen

Die konkrete Feldzuordnung wird gegen die Catalyst-API-Dokumentation validiert. Screenshots definieren den fachlichen Umfang, aber keine verlässlichen API-Feldnamen.

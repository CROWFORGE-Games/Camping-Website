# Google Apps Script Setup

Diese Variante schreibt Anfragen und Spots ueber einen Apps-Script-Web-App-Webhook in dein Google Sheet und liest die Spot-Statuswerte auch wieder fuer die Website aus.

Dein Sheet:

- `1r7EpmM4JBXTvac94nl73T98qYjzDH9r26pS2XUfKq3w`

## Setup

1. [script.google.com](https://script.google.com/) oeffnen
2. Neues Projekt anlegen
3. Inhalt aus `Code.gs` einfuegen
4. Optional `SHARED_TOKEN` setzen
5. `Bereitstellen` -> `Neue Bereitstellung`
6. Typ `Web-App`
7. Zugriff so waehlen, dass dein Server zugreifen darf
8. Web-App-URL kopieren
9. Nach spaeteren Aenderungen an `Code.gs` die Web-App erneut bereitstellen

## Variablen im Website-Projekt

- `GOOGLE_APPS_SCRIPT_ENABLED=true`
- `GOOGLE_APPS_SCRIPT_WEBHOOK_URL=DEINE_WEB_APP_URL`
- `GOOGLE_APPS_SCRIPT_TOKEN=gleiches_token_wie_in_Code_gs_optional`
- `GOOGLE_APPS_SCRIPT_BOOKINGS_SHEET=Buchungen`
- `GOOGLE_APPS_SCRIPT_CONTACT_SHEET=Anfragen`
- `GOOGLE_APPS_SCRIPT_SPOTS_SHEET=Spots`

## Was geschrieben wird

`Anfragen`

- Erstellt am
- Anfrageart
- Status
- Name
- E-Mail
- Telefon
- Strasse
- PLZ / Ort
- Land
- Betreff
- Anreise
- Abreise
- Wunschstellplatz
- Wunschstellplatzbereich
- Wunschstellplatznummer
- Platzwahl
- Erwachsene
- Kinder
- Alter der Kinder
- Geschaetzter Gesamtpreis
- Nachricht
- ID

`Spots`

- Stellplatz
- Stellplatznummer
- Status

## Was gelesen wird

Die Website liest `Spots` direkt ueber Google Apps Script.

Statuswerte:

- `0` = frei
- `1` = reserviert
- `2` = besetzt

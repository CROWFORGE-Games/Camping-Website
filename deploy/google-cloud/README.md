# Google Cloud Run Deployment

Diese Website laeuft auf Google Cloud am sinnvollsten als einzelner Cloud-Run-Service mit persistentem Cloud-Storage-Mount.

Warum genau so:

- die App speichert Buchungen, Preise, Einstellungen und Benutzer in `data/store.json`
- hochgeladene Bilder landen in `uploads/`
- der aktuelle Session-Store ist in-memory

Darum sollte der erste produktive Stand so ausgerollt werden:

- `Cloud Run`
- `Cloud Storage` als gemountetes Volume fuer `data/` und `uploads/`
- `max-instances=1`
- `concurrency=1`

So vermeidest du Datenkonflikte mit der dateibasierten Speicherung.

## Welche Variablen du setzen musst

Pflicht:

- `SESSION_SECRET`
- `ADMIN_PASSWORD`
- `ADMIN_EMAIL`

Empfohlen:

- `BOOKING_RECIPIENT_EMAIL`
- `BOOKING_PHONE`
- `GOOGLE_APPS_SCRIPT_ENABLED=true`
- `GOOGLE_APPS_SCRIPT_WEBHOOK_URL`
- `GOOGLE_APPS_SCRIPT_TOKEN`
- `GOOGLE_APPS_SCRIPT_BOOKINGS_SHEET=Buchungen`
- `GOOGLE_APPS_SCRIPT_CONTACT_SHEET=Anfragen`
- `GOOGLE_APPS_SCRIPT_SPOTS_SHEET=Spots`
- `TRUST_PROXY=1`
- `SESSION_COOKIE_SECURE=true`
- `DATA_DIR=/mnt/state/data`
- `UPLOADS_DIR=/mnt/state/uploads`

Hinweis:

- `PORT` wird von Cloud Run gesetzt und muss dort nicht manuell gepflegt werden.
- Werte wie `BOOKING_RECIPIENT_EMAIL` und `BOOKING_PHONE` dienen als Startwerte fuer die erste Initialisierung.
- Danach werden Aenderungen aus der Admin-Oberflaeche im persistenten Store gespeichert.
- Das Apps Script muss als Web App deployed sein.
- Wenn du ein Token setzt, muss dasselbe Token auch im Apps Script hinterlegt werden.

## Schnellstart

1. Google Cloud CLI installieren und anmelden
2. Beispielwerte in `cloudrun.env.yaml.example` anpassen
3. Starke Secrets festlegen
4. Deploy-Skript starten

Beispiel:

```powershell
.\deploy\google-cloud\deploy.ps1 `
  -ProjectId "DEIN_GCP_PROJEKT" `
  -Region "europe-west3" `
  -ServiceName "camping-website" `
  -BucketName "dein-camping-website-state" `
  -AdminEmail "admin@deinedomain.at" `
  -BookingRecipientEmail "info@hiasenhof-thiersee.at" `
  -BookingPhone "+43 664 885 305 24" `
  -SessionSecret "HIER_EIN_LANGES_ZUFAELLIGES_SECRET" `
  -AdminPassword "HIER_EIN_STARKES_ADMIN_PASSWORT"
```

## Was das Skript erledigt

- benoetigte Google APIs aktivieren
- Service Account anlegen
- Cloud-Storage-Bucket anlegen
- Bucket-Berechtigung fuer Cloud Run setzen
- Secrets in Secret Manager anlegen
- Secret-Zugriff fuer Cloud Run setzen
- Cloud Run Service aus dem aktuellen Projekt deployen
- Cloud-Storage-Volume nach `/mnt/state` mounten

## Wichtige Architektur-Hinweise

- Die aktuelle App ist nicht fuer horizontale Skalierung gebaut.
- Mit `max-instances=1` und `concurrency=1` bleibt sie stabil.
- Wenn spaeter mehrere Instanzen noetig sind, sollten `data/store.json` und Sessions auf Firestore, Cloud SQL oder Redis umgebaut werden.

## Nach dem Deploy

1. Website aufrufen
2. Admin-Login testen
3. Kontaktformular und Buchungsformular pruefen
4. Testbuchung absenden
5. Testbild hochladen
6. Danach optional eigene Domain an Cloud Run binden

# Hiasen Hof Plattform

Diese Version erweitert die bisher statische Website um eine geschützte Admin-App.

## Was jetzt enthalten ist

- Öffentliche Website für Besucher
- Geschützte Admin-App unter `/admin/`
- Login für berechtigte Benutzer
- Verwaltung für:
  - Preise
  - Stellplätze und Status
  - Buchungen
  - Website-Inhalte per Edit-Modus
  - Empfänger-E-Mail und SMTP-Einstellungen
  - Benutzer
- Web-Push-Grundlage für neue Buchungen
- Website-Buchungen landen im Backend und können E-Mail + Push auslösen

## Starten

1. `.env.example` nach `.env` kopieren
2. Werte in `.env` anpassen
3. `npm install`
4. `npm start`
5. oder direkt `npm run local`
5. Öffnen:
   - Website: [http://localhost:3001/index.html](http://localhost:3001/index.html)
   - Admin-App: [http://localhost:3001/admin/](http://localhost:3001/admin/)

## Komfort-Start

- `npm run local`: startet den Server und öffnet direkt die Website im Browser
- `npm run open`: öffnet nur die Website im Browser
- `npm start`: startet nur den Server

## Standard-Zugang

Wenn noch kein Benutzer existiert, wird beim ersten Start ein Admin-Benutzer angelegt:

- E-Mail: Wert aus `ADMIN_EMAIL`
- Passwort: Wert aus `ADMIN_PASSWORD`

Diese Standardwerte unbedingt direkt ändern.

## Wichtige Bereiche

### Admin-App

- `Übersicht`: schneller Status über Buchungen, Preise, Plätze und Benutzer
- `Buchungen`: neue Anfragen von der Website
- `Preise`: synchron gepflegte Preisdaten für Website und Buchung
- `Stellplätze`: Plätze hinzufügen, entfernen, aktivieren, Status ändern
- `Website-Inhalte`: HTML-Seiten direkt bearbeiten
- `Einstellungen`: Buchungs-E-Mail, Telefon, SMTP, Website-Name
- `Benutzer`: weitere berechtigte Personen anlegen

### Öffentliche Website

- Preise kommen aus `/api/public/bootstrap`
- Buchungsanfragen gehen an `/api/public/bookings`
- Stellplatzstatus wird dynamisch geladen
- Der Wunschplatz und der berechnete Preis werden mitgesendet

## Bilder und Edit-Modus

Im Admin-Bereich können Bilder hochgeladen werden. Die Dateien landen in `uploads/`.

Die Seitenbearbeitung funktioniert aktuell als geschützter HTML-Editor für:

- `index.html`
- `campingplatz.html`
- `lageplan.html`
- `erlebnisse.html`
- `preise.html`
- `buchen.html`
- `anreise.html`

## Mail-Versand

Für echten E-Mail-Versand müssen unter `Einstellungen` SMTP-Daten gesetzt werden:

- SMTP Host
- SMTP Port
- SMTP Benutzer
- SMTP Passwort
- Absender E-Mail
- Absender Name
- Buchungs-E-Mail

Ohne SMTP werden Buchungen trotzdem gespeichert, aber nicht per E-Mail weitergeleitet.

## Push-Benachrichtigungen

Die Admin-App kann Web-Push aktivieren.

Voraussetzungen:

- Browser mit Push-Unterstützung
- HTTPS in produktiver Umgebung
- Admin muss in der App auf `Push aktivieren` klicken

## Produktive nächste Schritte

Vor echtem Live-Betrieb sollte noch ergänzt werden:

1. HTTPS / Reverse Proxy
2. Backup-Konzept für `data/` und `uploads/`
3. Rollenrechte feiner trennen
4. Änderungsprotokoll für Inhalte und Preise
5. Optional echte visuelle CMS-Blöcke statt rohem HTML
6. Optional native Mobile-App oder PWA-Optimierung

## Datenablage

- `data/store.json`: Benutzer, Preise, Stellplätze, Buchungen, Einstellungen, Push-Subscriptions
- `uploads/`: hochgeladene Bilder
- HTML-Dateien im Projektstamm: öffentliche Seiten und Edit-Modus-Ziel

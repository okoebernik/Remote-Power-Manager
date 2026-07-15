# Remote Power Manager

Next.js/TypeScript-Webanwendung zum Schalten von Remote-Steckdosen per MQTT, mit Benutzerverwaltung, Geräte-Zuweisungen, MQTT-Einstellungen und Aktionsprotokoll.

Nutzt SQLite oder MySQL/MariaDB als Datenbank.

## Start

```bash
npm install
npm run dev
```

Danach im Browser öffnen: [http://localhost:3000](http://localhost:3000)

Erster Admin-Login (sofern keine bestehende Datenbank verwendet wird):

```text
Benutzer: admin
Passwort: admin123
```

Bitte nach dem ersten Login unter **Benutzer** ein neues Admin-Passwort setzen oder den Start-Admin entfernen.

## Produktion / Deployment

Für den Betrieb auf einem Server oder Zugriff über eine andere IP als `localhost` **nicht** `npm run dev` verwenden, sondern einen Production-Build:

```bash
npm run build
npm run start
```

`npm run dev` ist nur für die lokale Entwicklung gedacht und baut eine WebSocket-Verbindung für Hot-Reload (HMR) auf. Wird die Seite über eine LAN-IP oder einen Reverse-Proxy aufgerufen, kann dieser HMR-Handshake fehlschlagen (`ERR_INVALID_HTTP_RESPONSE` in der Browser-Konsole) — dadurch bleiben interaktive Elemente wie der Sidebar-Einklapp-Button oder der Dark-Mode-Umschalter wirkungslos, obwohl der Code korrekt ist.

### Zugriff aus anderen Subnetzen/über LAN-IP ohne TLS

Im Production-Build (`NODE_ENV=production`) wird das Session-Cookie standardmäßig mit dem `Secure`-Attribut gesetzt. Browser speichern `Secure`-Cookies nur in einem sicheren Kontext (HTTPS oder `http://localhost`). Wird die Anwendung per einfachem HTTP über eine LAN-IP (z. B. `http://192.168.x.x:3000`) aus einem anderen Subnetz aufgerufen, verwirft der Browser das Cookie stillschweigend — der Login scheint zu funktionieren, aber schon der nächste Seitenwechsel verlangt erneut einen Login, und Status-Abfragen (z. B. MQTT) schlagen mit `401` fehl, was in der Oberfläche als „getrennt“ erscheint.

Steht kein TLS (z. B. via Reverse-Proxy) zur Verfügung, kann das `Secure`-Attribut über `.env.local` deaktiviert werden:

```bash
COOKIE_SECURE=false
```

Empfohlen ist stattdessen ein Reverse-Proxy mit TLS-Zertifikat, dann kann `COOKIE_SECURE` unverändert bleiben (Standard: an in Production).

## Konfiguration

Einstellungen erfolgen über `.env.local` (siehe `.env.local` im Projektverzeichnis, nicht eingecheckt):

```bash
SESSION_SECRET=<zufälliger, langer String>

DB_DRIVER=sqlite            # oder: mysql
SQLITE_PATH=../data/app.sqlite

# nur bei DB_DRIVER=mysql:
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=remote_power_manager
MYSQL_USER=root
MYSQL_PASSWORD=

INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=admin123

MQTT_HOST=127.0.0.1
MQTT_PORT=1883
MQTT_STATUS_TIMEOUT_SECONDS=2

# nur nötig für Zugriff per HTTP (ohne TLS) über eine LAN-IP/anderes Subnetz statt localhost, siehe unten:
# COOKIE_SECURE=false
```

Die Tabellen werden beim ersten Start automatisch angelegt bzw. bei Bedarf um fehlende Spalten ergänzt, ohne separates Migrationsskript.

## MQTT

Broker-Zugangsdaten aus `.env.local` dienen als Startwerte. Admins können Host/Port/Timeout/Credentials auch direkt unter **MQTT** in der Weboberfläche ändern — gespeicherte Werte überschreiben dann die `.env.local`-Defaults.

Unterstützt werden einfache ON/OFF-Payloads sowie strukturierte JSON-Payloads mit konfigurierbarem Power-Pfad (z. B. `POWER` oder `Status.Power`). Ein optionales Status-Request-Topic kann vor der Statusabfrage gesendet werden, falls das Gerät nicht von sich aus periodisch oder retained publiziert.

Im Dashboard wird der Steckdosen- und Ping-Status nach jedem An/Aus/Neustart sofort aktualisiert, zusätzlich läuft alle 30 Sekunden ein automatischer Hintergrund-Abgleich.

## Weitere Hinweise

- **Dark Mode**: über den Umschalter im Menü unten links, folgt standardmäßig der Systemeinstellung.
- **Navigation**: linke Seitenleiste, ein-/ausklappbar (Zustand wird im Browser gespeichert).
- **Sprache**: Deutsch/Englisch pro Benutzer umschaltbar.

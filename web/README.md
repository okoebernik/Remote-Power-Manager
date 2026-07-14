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

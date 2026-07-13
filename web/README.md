# Remote Power Manager (Next.js)

Next.js/TypeScript-Neubau der PHP-Anwendung im übergeordneten Verzeichnis. Schaltet Remote-Steckdosen per MQTT, mit Benutzerverwaltung, Geräte-Zuweisungen, MQTT-Einstellungen und Aktionsprotokoll.

Nutzt dieselbe Datenbank (SQLite oder MySQL/MariaDB) wie die PHP-Version unverändert weiter — bestehende Geräte, Benutzer und Zuweisungen müssen nicht neu angelegt werden.

> **Status:** Diese Version läuft parallel zur produktiven PHP-Anwendung und wird gerade gegen echte Geräte verifiziert. Die PHP-Dateien bleiben bis zum finalen Cutover unangetastet.

## Start

```bash
npm install
npm run dev
```

Danach im Browser öffnen: [http://localhost:3000](http://localhost:3000)

Erster Admin-Login (identisch zur PHP-Version, sofern keine bestehende Datenbank verwendet wird):

```text
Benutzer: admin
Passwort: admin123
```

Bitte nach dem ersten Login unter **Benutzer** ein neues Admin-Passwort setzen oder den Start-Admin entfernen.

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

Die Tabellen werden beim ersten Start automatisch angelegt bzw. bei Bedarf um fehlende Spalten ergänzt — genau wie bei der PHP-Version, ohne separates Migrationsskript.

## MQTT

Broker-Zugangsdaten aus `.env.local` dienen als Startwerte. Admins können Host/Port/Timeout/Credentials auch direkt unter **MQTT** in der Weboberfläche ändern — gespeicherte Werte überschreiben dann die `.env.local`-Defaults, identisch zum Verhalten der PHP-Version.

Unterstützt werden einfache ON/OFF-Payloads sowie strukturierte JSON-Payloads mit konfigurierbarem Power-Pfad (z. B. `POWER` oder `Status.Power`). Ein optionales Status-Request-Topic kann vor der Statusabfrage gesendet werden, falls das Gerät nicht von sich aus periodisch oder retained publiziert.

Im Dashboard wird der Steckdosen- und Ping-Status nach jedem An/Aus/Neustart sofort aktualisiert, zusätzlich läuft alle 30 Sekunden ein automatischer Hintergrund-Abgleich.

## Weitere Hinweise

- **Dark Mode**: über den Umschalter im Menü unten links, folgt standardmäßig der Systemeinstellung.
- **Navigation**: linke Seitenleiste, ein-/ausklappbar (Zustand wird im Browser gespeichert).
- **Sprache**: Deutsch/Englisch pro Benutzer umschaltbar, wie in der PHP-Version.

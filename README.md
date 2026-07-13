# Remote Power Manager

Kleine PHP-Webanwendung zum Neustarten von Remote-Steckdosen per MQTT.

> **Hinweis:** Ein Neubau dieser Anwendung mit Next.js/TypeScript befindet sich in [`web/`](web/README.md) und nutzt dieselbe Datenbank unverändert weiter. Er wird aktuell parallel zur hier beschriebenen PHP-Version gegen echte Geräte getestet; die PHP-Dateien bleiben bis zum finalen Umstieg unangetastet.

Die Oberfläche unterstützt Deutsch und Englisch. Jeder Benutzer kann seine bevorzugte Sprache oben in der Navigation selbst umstellen.

## Start

```powershell
php -S 127.0.0.1:8080 -t public
```

Danach im Browser öffnen:

```text
http://127.0.0.1:8080
```

Erster Admin-Login:

```text
Benutzer: admin
Passwort: admin123
```

Bitte nach dem ersten Login unter **Benutzer** ein neues Admin-Passwort setzen oder den Start-Admin entfernen.

## MQTT

Die Anwendung spricht MQTT direkt über PHP-Sockets. `mosquitto_pub` und `mosquitto_sub` müssen nicht installiert sein.

Unterstützt wird MQTT 3.1.1 über TCP, mit oder ohne Benutzername/Passwort.

Broker-Zugangsdaten stehen in `config.php`.

Admins können den MQTT Server auch direkt in der Weboberfläche unter **MQTT** ändern:

- Broker Host/IP
- Port
- Status Timeout
- Betrieb ohne Credentials
- Betrieb mit Benutzername und Passwort

Die Werte aus `config.php` dienen als Startwerte. Sobald Einstellungen im Adminbereich gespeichert wurden, werden die Datenbankwerte verwendet.

Im Dashboard wird der Steckdosen- und Ping-Status automatisch alle 30 Sekunden aktualisiert.

Für MQTT-Statusmeldungen kann ein Gerät entweder ein einfaches ON/OFF-Payload oder ein strukturiertes JSON/YAML-Payload verwenden.
Bei strukturierten Payloads kann im Gerät ein Power-Pfad wie `POWER` oder `Status.Power` hinterlegt werden.

Beispiel:

- Topic: `36/Hobbyraum/Lasercutter1/tele/STATE`
- Optional request topic: `36/Hobbyraum/Lasercutter1/cmnd/STATE`
- Optional request payload: leer oder geraetespezifisch
- Status Parser: `Structured JSON/YAML payload`
- Power Key/Pfad: `POWER`

Wenn auf dem Status-Topic nicht regelmaessig retained oder periodische Nachrichten ankommen, kann die App vor der Abfrage optional selbst einen Status-Request senden.

## Datenbank

Standardmäßig wird SQLite verwendet: `data/app.sqlite`.

Falls beim Start diese Meldung erscheint:

```text
could not find driver
```

dann ist der passende PHP-PDO-Treiber nicht aktiviert.

### Option A: SQLite aktivieren

Aktiviere in deiner `php.ini` die Erweiterungen:

```ini
extension=pdo_sqlite
extension=sqlite3
```

Danach Webserver neu starten.

### Option B: MySQL/MariaDB nutzen

Erstelle zuerst die Datenbank, z. B. in phpMyAdmin oder per SQL:

```sql
CREATE DATABASE IF NOT EXISTS remote_power_manager
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

Stelle dann `config.php` auf MySQL um:

```php
'database' => [
    'driver' => 'mysql',
    'mysql' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'database' => 'remote_power_manager',
        'username' => 'root',
        'password' => '',
        'charset' => 'utf8mb4',
    ],
],
```

Die Tabellen legt die Anwendung beim ersten Start automatisch an.

Tabellen:

- `users`: Benutzer und Rollen
- `devices`: Steckdosen, MQTT Topics/Payloads, IP des angeschlossenen Geräts
- `device_user`: Zuordnung Benutzer zu Steckdosen
- `action_log`: Schaltvorgänge und Statusabfragen

Neue Geräte können Admins in der Oberfläche anlegen und Benutzern zuweisen.

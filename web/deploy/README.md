# Deployment als systemd-Service

`remote-power-manager.service` ist eine Vorlage, um die App per `npm run start` dauerhaft
im Hintergrund laufen zu lassen und automatisch neu zu starten (z. B. nach einem Reboot
oder Absturz).

## Einrichtung

1. **Node-Pfad ermitteln** (als der User, der die App später ausführen soll):

   ```bash
   which npm
   ```

   Passt der Pfad nicht zu `ExecStart=/usr/bin/npm run start` in der Unit-Datei, anpassen.

2. **Dedizierten User anlegen** (nicht als root laufen lassen):

   ```bash
   sudo useradd -r -s /usr/sbin/nologin rpm
   sudo chown -R rpm:rpm /opt/rpm-repo
   ```

   Pfad `/opt/rpm-repo` ist ein Beispiel — an den tatsächlichen Ablageort auf dem Server
   anpassen (in der Unit-Datei unter `WorkingDirectory` entsprechend ändern).

3. **`.env.local`** in `web/` muss auf dem Server vorhanden und korrekt konfiguriert sein
   (siehe [`../README.md`](../README.md#konfiguration)). Wird automatisch von Next.js aus
   `WorkingDirectory` geladen, muss nicht in der Unit-Datei dupliziert werden.

4. **Unit-Datei installieren:**

   ```bash
   sudo cp remote-power-manager.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now remote-power-manager.service
   ```

5. **Status/Logs prüfen:**

   ```bash
   sudo systemctl status remote-power-manager.service
   sudo journalctl -u remote-power-manager.service -f
   ```

## Hinweise

- `mosquitto.service`: nur relevant, falls der MQTT-Broker auf derselben Maschine läuft und
  via systemd verwaltet wird — sonst die `After=`/`Wants=`-Zeilen entfernen.
- Port 3000 ist Next.js-Default. Für Port 80/443 entweder `PORT=80` in `.env.local` setzen
  (dann braucht der Prozess `CAP_NET_BIND_SERVICE`, z. B. via
  `AmbientCapabilities=CAP_NET_BIND_SERVICE` in der Unit) oder — empfohlen — einen
  Reverse-Proxy (nginx/Caddy) davorschalten, der auch gleich TLS terminieren kann (siehe
  `COOKIE_SECURE` in [`../README.md`](../README.md)).

## Nach künftigen Deploys

```bash
git pull
npm run build
sudo systemctl restart remote-power-manager.service
```

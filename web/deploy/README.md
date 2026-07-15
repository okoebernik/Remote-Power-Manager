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

## Reverse-Proxy mit TLS (nginx, reines LAN ohne Domain)

`nginx-self-signed.conf` terminiert TLS extern mit einem selbstsignierten Zertifikat und
leitet intern per HTTP an die App (`127.0.0.1:3000`) weiter. Sinnvoll, wenn die App nur im
LAN läuft und keine öffentliche Domain für Let's Encrypt vorhanden ist.

Vorteil gegenüber `COOKIE_SECURE=false`: Der Browser sieht eine echte HTTPS-Verbindung (zu
nginx), das `Secure`-Cookie-Attribut kann also aktiviert bleiben (Standardverhalten in
Production) und muss nicht abgeschaltet werden — Zugriff aus anderen Subnetzen
funktioniert trotzdem.

1. **Zertifikat erzeugen** (einmalig, IP/Hostname anpassen):

   ```bash
   sudo mkdir -p /etc/nginx/ssl
   sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
     -keyout /etc/nginx/ssl/rpm.key -out /etc/nginx/ssl/rpm.crt \
     -subj "/CN=rpm.local" \
     -addext "subjectAltName=DNS:rpm.local,IP:192.168.1.10"
   ```

2. **Config installieren** (zuvor `server_name`/IP in der Datei anpassen):

   ```bash
   sudo cp nginx-self-signed.conf /etc/nginx/sites-available/remote-power-manager.conf
   sudo ln -s /etc/nginx/sites-available/remote-power-manager.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. **Next.js weiterhin nur auf `127.0.0.1:3000` binden lassen** (nicht auf `0.0.0.0`), damit
   die App nur über nginx erreichbar ist, nicht direkt am Port ohne TLS.

Da kein öffentlich vertrauenswürdiges Zertifikat verwendet wird, zeigen Browser beim ersten
Zugriff eine Warnung — das ist bei einer reinen LAN-Lösung ohne Domain normal. Wer das
vermeiden will, kann `rpm.crt` auf den Clients manuell als vertrauenswürdig importieren,
oder alternativ eine echte Domain mit Let's Encrypt einrichten (z. B. über Caddy).

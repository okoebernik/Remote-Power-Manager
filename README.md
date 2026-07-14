# Remote Power Manager

Next.js/TypeScript-Webanwendung zum Schalten und Neustarten von Remote-Steckdosen per MQTT.

Die Anwendung liegt in [`web/`](web/README.md) — dort stehen Setup, Konfiguration, MQTT- und Datenbank-Details.

## Kurzstart

```bash
cd web
npm install
npm run dev
```

Danach im Browser öffnen: [http://localhost:3000](http://localhost:3000)

Für den Betrieb auf einem Server/im Netzwerk statt `npm run dev` einen Production-Build verwenden (`npm run build && npm run start`), siehe [`web/README.md`](web/README.md#produktion--deployment) — sonst können HMR-WebSocket-Fehler die Interaktivität der Seite (z. B. Sidebar, Dark-Mode-Umschalter) stören.

Erster Admin-Login:

```text
Benutzer: admin
Passwort: admin123
```

Bitte nach dem ersten Login unter **Benutzer** ein neues Admin-Passwort setzen oder den Start-Admin entfernen.

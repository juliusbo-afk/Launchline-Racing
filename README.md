# LAUNCHLINE — Multiplayer Reaction Drag Racing

Ein spielbares deutschsprachiges 1-gegen-1-Drag-Racing-Reaktionsspiel.

## Lokal starten

1. Node.js 18+ installieren.
2. Im entpackten Projektordner ein Terminal öffnen.
3. `npm install`
4. `npm start`
5. `http://localhost:3000` öffnen.

## Spielen

- Sechs Autos auswählen.
- **Online 1V1:** Raum erstellen, Einladungslink kopieren, an Freund senden. Der Freund tritt über denselben Link bei.
- Beide klicken **Bereit machen**.
- Ampel: drei rote Lichter, dann grün. **Erst bei Grün** Leertaste/Enter oder Startknopf drücken.
- Ein Frühstart zählt als Fehler. Der serverseitig gemessene Start plus ein kleiner Autonachteil entscheidet das Rennen. Nach der Ergebnisanzeige auf **Nächste Runde** klicken, dann beide erneut bereit machen.
- **Training:** Reaktion gegen CPU üben; läuft auch ohne Verbindung zum Server, nachdem die Seite geladen ist.

## Wirklich online spielen

Stelle den **gesamten Projektordner** auf einem Node.js-Host bereit, z. B. Render:
- Neues **Web Service** aus einem GitHub-Repository mit dem gesamten Projekt.
- Build Command: `npm install`
- Start Command: `npm start`
- Laufzeit: Node.js.
- Der Server verwendet automatisch die vom Anbieter gesetzte `PORT`-Umgebungsvariable und WebSockets.
- Anschließend die HTTPS-URL teilen. Beide Spieler müssen denselben Server verwenden.

**Wichtig:** GitHub Pages allein reicht nicht für echten Multiplayer, da der WebSocket-Server dort nicht läuft. Räume und Punktestände liegen nur im Arbeitsspeicher und verschwinden bei Server-Neustarts. Serverlose Hosting- oder Sleep-Konfigurationen können laufende Rennen unterbrechen. Timing wird auf dem Server erfasst und unterliegt normaler Netzwerk-Latenz; es ist kein professionell kalibriertes Zeitmesssystem. Abhängig vom Hosting ist fairer Vergleich bei stark unterschiedlicher Latenz eingeschränkt.

## Dateien

- `server.js` — HTTP + WebSocket, private Räume, Countdown, Fehlstart- und Siegwertung
- `public/index.html` — Browseroberfläche
- `public/style.css` — Responsive Design
- `public/app.js` — Fahrzeugauswahl, Live-Darstellung, Trainingsmodus
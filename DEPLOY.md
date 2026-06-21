# Deployment (Coolify / Hetzner)

ProcessFox ships as two containers, definiert in [`docker-compose.yml`](docker-compose.yml):

| Service | Inhalt | Port |
|---|---|---|
| `frontend` | Generator-SPA (statisch via nginx, proxyt `/api` → backend) | 80 (→ 8080 lokal) |
| `backend` | Agent + Persistenz (Fastify, File-Store auf Volume) | 8787 |

Der **API-Key bleibt im Backend** — die SPA spricht das Backend nur über den nginx-Proxy an.

## Build-Strategie: CI baut, Coolify zieht nur

Die Images werden in **GitHub Actions** ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml))
auf einem 7-GB-Runner gebaut und nach **GHCR** gepusht. Coolify **baut nichts** — es
**zieht** die fertigen Images (`docker-compose.yml` nutzt `image:` statt `build:`). So
reicht eine **4-GB-Box** locker, weil dort nur ausgeführt, nicht gebaut wird.

Ablauf bei jedem `git push` auf `main`:

```
push → GitHub Actions: baut frontend+backend → pusht ghcr.io/<owner>/processfox-*:latest
     → ruft Coolify-Deploy-Webhook → Coolify zieht :latest und startet neu
```

### Einmalige Einrichtung

1. **GHCR-Images für Coolify zugänglich machen** (sie sind anfangs privat):
   - **Einfach:** Paket-Sichtbarkeit auf *public* setzen (GitHub → Profil/Org → Packages →
     `processfox-frontend`/`-backend` → Package settings → Change visibility).
   - **Privat (empfohlen):** in Coolify unter *Keys & Tokens → Registries* eine GHCR-
     Zugangsdaten anlegen (Username = GitHub-Handle, Passwort = PAT mit `read:packages`).
2. **Coolify-Resource:** Docker Compose, mit diesem Repo verbunden, Compose-Datei
   `docker-compose.yml`. **Auto-Deploy bei Push deaktivieren** — das Deploy stößt der
   Workflow an, *nachdem* die Images gepusht sind (sonst zieht Coolify das alte `:latest`).
3. **Auto-Deploy-Webhook (optional, empfohlen):** In Coolify den Deploy-Webhook der
   Resource kopieren und als GitHub-Secrets hinterlegen:
   - `COOLIFY_WEBHOOK` = Deploy-URL (enthält die Resource-UUID)
   - `COOLIFY_TOKEN` = Coolify-API-Token
   Ohne diese Secrets überspringt der Workflow den Deploy-Schritt — dann einfach in
   Coolify **Redeploy** klicken, sobald die Action grün ist.
4. **Environment-Variable** in Coolify (siehe [`.env.example`](.env.example)):
   nur `ANTHROPIC_API_KEY`.
5. **Domain** auf den `frontend`-Service (Port 80) zeigen lassen; Coolify übernimmt TLS.

> Falls dein GHCR-Owner nicht `processfox` ist: in Coolify die Variablen
> `FRONTEND_IMAGE` / `BACKEND_IMAGE` auf die korrekten Image-Pfade setzen.

## Persistenz-Backend

V1 nutzt den **File-Store** (`FileSpecStore`): App-Specs werden als versionierte JSON-
Dateien unter `PROCESSFOX_DATA_DIR` (`/data`) gespeichert. Compose mountet dafür das
Volume `pfdata`, sodass die Specs **Redeploys überleben**. Kein Datenbank-Container nötig.

> **Postgres später:** Der Code unterstützt einen `PrismaSpecStore` (aktiviert sich, wenn
> `DATABASE_URL` gesetzt ist). Er ist im Repo dormant (`packages/agent/src/store/`,
> `prisma/schema.prisma`); für die Aktivierung müssten Prisma-Deps + ein
> `prisma generate`-Schritt wieder eingebunden werden. Für ein Single-Host-V1 ist der
> File-Store ausreichend.

## App-Export

Der Export erzeugt eine **einzelne, eigenständige HTML-Datei** (alles inline), die der
Sachbearbeiter lokal per Doppelklick öffnet — kein Server. Er läuft **clientseitig im
Browser**: Das **Frontend** baut die Single-File-Player-Vorlage und serviert sie unter
`/player.html`; die SPA holt sie, spritzt das Manifest ein und lädt die Datei herunter.
Nur das Frontend-Image führt einen Vite-Build aus — das Backend braucht dafür nichts.

## Lokal mit Docker

Die Compose-Datei referenziert die in CI gebauten GHCR-Images (kein `build:`), zieht sie
also nur:

```bash
cp .env.example .env       # Werte eintragen
docker compose pull && docker compose up
# Frontend: http://localhost:8080
```

Zum lokalen Bauen der Images ohne CI (z. B. Test):

```bash
docker build -f packages/runtime/Dockerfile -t ghcr.io/processfox/processfox-frontend:latest .
docker build -f packages/agent/Dockerfile   -t ghcr.io/processfox/processfox-backend:latest .
docker compose up
```

## Ohne Docker (Entwicklung)

```bash
# Backend (Persistenz; Key optional, sonst kein /api/generate)
ANTHROPIC_API_KEY=sk-... npm run start -w @processfox/agent

npm run dev -w @processfox/runtime            # Frontend (proxyt /api → :8787)
```

Im Dev-Modus serviert Vite `/player.html` (nicht-inline) — der Export-Button funktioniert,
die Datei ist dort aber nicht self-contained. Self-contained ist sie aus dem
Produktions-Frontend (nginx serviert die gebaute Single-File-Vorlage).

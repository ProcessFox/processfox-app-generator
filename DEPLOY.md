# Deployment (Coolify / Hetzner)

ProcessFox ships as three containers, definiert in [`docker-compose.yml`](docker-compose.yml):

| Service | Inhalt | Port |
|---|---|---|
| `frontend` | Generator-SPA (statisch via nginx, proxyt `/api` → backend) | 80 (→ 8080 lokal) |
| `backend` | Agent + Persistenz + Export (Fastify) | 8787 |
| `postgres` | App-Spec-Speicher | 5432 |

Der **API-Key bleibt im Backend** — die SPA spricht das Backend nur über den nginx-Proxy an.

## Coolify

1. Neues Projekt → **Docker Compose** → dieses Repo verbinden.
2. Compose-Datei: `docker-compose.yml` (Root).
3. Environment-Variablen setzen (siehe [`.env.example`](.env.example)):
   - `ANTHROPIC_API_KEY`
   - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
4. Domain auf den `frontend`-Service (Port 80) zeigen lassen; Coolify übernimmt TLS.
5. Deploy. Beim Start synchronisiert das Backend das Schema (`prisma db push`) und startet.

`DATABASE_URL` wird in der Compose-Datei aus den Postgres-Variablen zusammengesetzt — nicht separat setzen.

## Persistenz-Backend

- **Mit `DATABASE_URL`** (Compose-Default): Postgres via Prisma (`PrismaSpecStore`).
- **Ohne `DATABASE_URL`**: dateibasierter Store (`FileSpecStore`) unter `PROCESSFOX_DATA_DIR`
  (für lokale Entwicklung; in Produktion ein Volume mounten, sonst gehen Specs bei Redeploy verloren).

## App-Export

Der Export-Endpoint (`GET /api/apps/:id/versions/:v/export`) erzeugt eine **einzelne,
eigenständige HTML-Datei** (alles inline), die der Sachbearbeiter lokal per Doppelklick
öffnet — kein Server. Das Backend liest dafür die einmal gebaute Player-Vorlage
(`PROCESSFOX_PLAYER_TEMPLATE`, im Image gesetzt).

## Lokal mit Docker

```bash
cp .env.example .env   # Werte eintragen
docker compose up --build
# Frontend: http://localhost:8080
```

## Ohne Docker (Entwicklung)

```bash
# Backend (Export + Persistenz; Key optional, sonst kein /api/generate)
PROCESSFOX_PLAYER_TEMPLATE=packages/runtime/dist-player/player.html \
  ANTHROPIC_API_KEY=sk-... npm run start -w @processfox/agent

npm run build:player -w @processfox/runtime   # einmalig: Player-Vorlage bauen
npm run dev -w @processfox/runtime            # Frontend (proxyt /api → :8787)
```

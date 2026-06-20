# ProcessFox

Ein Business-App-Generator nach dem Vorbild von Lovable und Base44 — mit einem
entscheidenden Unterschied: Statt Code zu generieren, stellt ein KI-Agent Apps aus
**vordefinierten, typisierten Modulen** zusammen. Der Nutzer versteht dadurch immer,
**wo und wie seine Daten verarbeitet werden**.

In Version 1 laufen alle Module **vollständig im Browser** des Endnutzers — kein
Server, kein LLM zur Laufzeit der generierten App. Eine exportierte App ist **eine
einzige HTML-Datei**, die der Sachbearbeiter lokal per Doppelklick öffnet.

> **Kernidee:** Der Agent erzeugt keinen Code, sondern ein **deklaratives
> JSON-Manifest**, das Module auswählt, konfiguriert und verdrahtet. Jedes Manifest
> wird vor der Nutzung validiert.

## Beispiel

Der Sachbearbeiter lädt eine Produktliste hoch (**XLSX-Upload**), die Spalten werden
zugeordnet (**Spalten-Mapping**), und daraus entsteht pro Zeile ein sauber
formatiertes Word-Dokument (**DOCX-Vorlage**) — alles lokal im Browser, ohne LLM.

## Wie es funktioniert

```
 Ersteller                                          Sachbearbeiter
 ─────────                                          ──────────────
 Prompt ──▶ KI-Agent (Claude, Tool-Use)            lädt die App (statische
              │  list_modules                        HTML-Datei) und führt sie
              │  get_module_schema                   lokal im Browser aus
              │  propose_app ──▶ Validator ⟳
              ▼
        validiertes Manifest ──▶ Live-Vorschau ──▶ Export als 1 HTML-Datei
        (typisierter Modul-Graph)
```

Eine App ist ein typisierter, gerichteter Graph aus Modulen (Input → Transform →
Output). Weil das ein sichtbarer Graph bekannter Bausteine ist, kann die App dem
Nutzer transparent zeigen, was mit seinen Daten passiert („🔒 läuft lokal im
Browser").

## Module (V1)

| Kategorie | Module |
|---|---|
| **Input** | XLSX-Upload, CSV-Upload |
| **Transform** | Spalten-Mapping, Filter & Sortierung |
| **Output** | DOCX-Vorlage, CSV-Export, XLSX-Export |

Design pro App/Modul anpassbar (Theme-Tokens); die Kernmechanik (Ports, Verarbeitung)
ist gesperrt.

## Monorepo

```
packages/
  core/      Framework-agnostisch: Modul-Contract, Port-Typsystem, Manifest,
             Registry, Validator, Theme, Export-Logik. (keine React/DOM-Abhängigkeit)
  runtime/   React + Vite + Tailwind: Ausführungs-Engine, Modul-Implementierungen,
             Player, Editor, Generator-UI, Standalone-Player + Export.
  agent/     Node + Fastify: Claude-Tool-Use-Loop (Prompt → Manifest), Persistenz,
             Export-Endpoint.
```

## Schnellstart (Entwicklung)

```bash
npm install

# Player-Vorlage einmalig bauen (für den Export-Endpoint)
npm run build:player -w @processfox/runtime

# Backend (Generierung braucht ANTHROPIC_API_KEY; Persistenz/Export auch ohne)
PROCESSFOX_PLAYER_TEMPLATE=packages/runtime/dist-player/player.html \
  ANTHROPIC_API_KEY=sk-... npm run start -w @processfox/agent     # :8787

# Frontend (proxyt /api → :8787)
npm run dev -w @processfox/runtime                                # :5173
```

Ohne API-Key funktioniert alles außer der eigentlichen Generierung (`/api/generate`).
Die **Demo-App**-Ansicht zeigt das Modul-System, den Editor, Persistenz und Export
ohne Key.

## Tests & Checks

```bash
npm test           # alle Pakete
npm run typecheck  # tsc --noEmit, strict, über alle Pakete
```

## HTTP-API (Backend)

| Methode | Pfad | Zweck |
|---|---|---|
| `GET`  | `/api/health` | Healthcheck → `{ ok, hasApiKey }` |
| `GET`  | `/api/modules` | Modul-Katalog |
| `POST` | `/api/generate` | `{ prompt }` → validiertes Manifest |
| `POST` | `/api/apps` | App speichern (Version 1) |
| `POST` | `/api/apps/:id/versions` | neue, immutable Version |
| `GET`  | `/api/apps` · `/api/apps/:id` · `/api/apps/:id/versions/:v` | lesen |
| `GET`  | `/api/apps/:id/versions/:v/export` | Single-File-HTML-Export |

## Deployment

Drei Container (frontend / backend / postgres) via [`docker-compose.yml`](docker-compose.yml).
Anleitung für **Coolify / Hetzner**: siehe [DEPLOY.md](DEPLOY.md). Der Backend-Container
hat einen Healthcheck auf `/api/health`; das Frontend startet erst, wenn das Backend
gesund ist.

## Tech-Stack

- **Frontend:** React, Vite, Tailwind CSS, SheetJS (`xlsx`), docxtemplater
- **Backend:** Node, Fastify, Anthropic SDK (`claude-opus-4-8`)
- **Persistenz:** Postgres via Prisma (Produktion) bzw. Datei-Store (Entwicklung)
- **Validierung/Schemas:** Zod

## Weitere Dokumente

- [PLAN.md](PLAN.md) — Architektur & Meilensteine
- [DEPLOY.md](DEPLOY.md) — Coolify/Docker-Deployment
- [CLAUDE.md](CLAUDE.md) — Hinweise für die Arbeit am Code

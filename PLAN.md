# ProcessFox – Architektur- und Umsetzungsplan (V1)

> **Zentrale Designentscheidung:** Der KI-Agent generiert **keinen Code**, sondern eine
> **deklarative App-Spezifikation (JSON-Manifest)**, das vordefinierte Module auswählt,
> konfiguriert und verdrahtet. Das macht das Transparenzversprechen technisch garantierbar:
> Eine App ist ein typisierter Graph aus bekannten Bausteinen – nichts Unsichtbares.

ProcessFox ist ein Business-App-Generator nach Vorbild von Lovable/Base44, der jedoch
statt Code zusammengesetzte, vordefinierte Module nutzt. V1 fokussiert auf Module, die
**rein im Browser** des Endnutzers laufen – kein Server, kein LLM zur Laufzeit der
generierten App.

---

## 1. Zwei-Ebenen-Architektur

| Ebene | Wer nutzt sie | Was sie tut |
|---|---|---|
| **Generator** (ProcessFox selbst) | Ersteller / Power-User | Prompt → KI-Agent → Live-Vorschau + Datenfluss-Canvas → App speichern/exportieren |
| **Runtime / „Player"** | Sachbearbeiter (Endnutzer) | Führt das Manifest als fertige App aus – im Browser, kein Server |

Die Runtime wird (a) als Live-Vorschau im Generator eingebettet und (b) als **statisches
Bundle** exportiert (HTML + JS + eingebettetes Manifest), das der Sachbearbeiter lokal öffnet.

---

## 2. Modulsystem (Herzstück)

Trennung von **Definition** (Metadaten, Ports, Config-Schema, Dependencies, Credentials –
framework-agnostisch, im `core`-Paket) und **Implementierung** (UI + `run` – im
Runtime-Paket, browserabhängig).

Kategorien: **Input**, **Transform**, **Output**, **Credentials** (V1 leer).

Typisierte **Ports** verhindern inkompatible Verdrahtung. Typen u. a.:
`table`, `recordList`, `file`, `text`, `json`, `image`, `binary`.

Design pro Modul anpassbar (Tailwind/Theme-Tokens), **Kernmechanik gesperrt** (`run` + Ports).

---

## 3. Der KI-Agent

**Claude API + Tool Use** (nicht der volle Agent SDK) – der Agent wählt aus einer Registry,
konfiguriert und erzeugt ein **validiertes Manifest**, statt Code zu schreiben.

- SDK: `@anthropic-ai/sdk` (TypeScript), API-Key **immer serverseitig**.
- Modell: `claude-opus-4-8` (Default), `thinking: { type: "adaptive" }`.
- Agent-Tools: `list_modules()`, `get_module_schema(id)`, `propose_app(manifest)`
  (läuft sofort durch den Validator → Self-Correction-Loop).
- Strukturierte Ausgabe über `strict: true` Tool-Schemas.

---

## 4. Datentransparenz (Kernversprechen)

Da die App ein sichtbarer, typisierter Graph ist: **Datenfluss-/Privacy-Panel** für den
Sachbearbeiter. In V1 technisch garantierbar (kein Netzwerk-Modul vorhanden).
Pro Modul ein Badge „läuft lokal im Browser".

---

## 5. Tech-Stack

- **Frontend (Generator + Runtime):** React + Vite + TypeScript + Tailwind, shadcn/ui, React Flow.
- **Browser-Libs der Module:** SheetJS (`xlsx`), docxtemplater, `pdf-lib`/`pdfmake`,
  `JSZip`, `file-saver`. Schemas/Validierung: `zod`.
- **Backend (nur Generator):** Node + Fastify, `@anthropic-ai/sdk`.
- **Persistenz:** PostgreSQL + Prisma (versionierte App-Specs). Auth nur für Ersteller.

---

## 6. Deployment (Coolify / Hetzner)

`docker-compose`: `frontend` (Nginx, statisch), `backend` (Node), `postgres`.
`ANTHROPIC_API_KEY` als Coolify-Secret. TLS via Coolify. Exportierte Endnutzer-Apps sind
rein statisch – keine Infrastruktur nötig.

---

## 7. Modul-Roadmap V1 (browser-only)

- **Input:** XLSX-Upload, CSV-Upload, manuelles Formular, Datei-Upload
- **Transform:** Spalten-Mapping, Filter/Sortierung, Template-Merge
- **Output:** DOCX-Template, PDF, XLSX/CSV-Export, ZIP-Bündel

---

## 8. Phasen / Meilensteine

1. **M1 – Fundament:** Modul-Contract, Typsystem, Validator, Registry (+ Beispielmodule). ✅
2. **M2 – Runtime/Player:** Manifest-Renderer + Datenfluss-Panel. ✅
3. **M3 – Generator-Agent:** Tool-Use-Loop, Prompt → Manifest, Live-Vorschau. ✅
4. **M4 – Editor:** Design-Anpassung (Theme-Tokens), Persistenz/Versionierung. ✅
5. **M5 – Export & Coolify-Deployment.** ✅
6. **M6 – Modul-Ausbau + Härtung.** ← *als Nächstes*

---

## 9. Offene Entscheidungen

- DOCX-Lib-Lizenz (docxtemplater Premium-Module?).
- Manifest = Single Source of Truth, strikt versioniert (Migrations bei Modul-Updates).
- SheetJS Community vs. Pro je nach Formatbedarf.

---

## Repo-Struktur (wächst mit den Phasen)

```
processfox-app-generator/
├── PLAN.md
├── DEPLOY.md               # M5: Coolify/Docker-Anleitung
├── docker-compose.yml      # M5: frontend + backend + postgres
├── .env.example
├── package.json            # npm workspaces
└── packages/
    ├── core/               # M1: Contract, Typsystem, Validator, Registry (framework-agnostisch)
    │   ├── src/{ports,module,manifest,validator,registry}.ts
    │   ├── src/modules/    # Beispiel-Moduldefinitionen
    │   └── test/
    ├── runtime/            # M2: Runtime/Player (React + Vite + Tailwind)
    │   ├── src/engine/     # Ausführungs-Engine (DAG, Koerzion) – React-frei, im Node testbar
    │   ├── src/impl/       # je Modul: *.run.ts (Logik) + *.ui.tsx (React), getrennt
    │   ├── src/ui/         # Player, DataFlowPanel, GeneratorView, ThemeEditor, AppWorkbench (M3/M4)
    │   ├── src/player/     # M5: StandalonePlayer + Entry (eingebettetes Manifest)
    │   ├── src/export/     # M5: Single-File-Export (Re-Export aus core) + CLI
    │   ├── player.html · vite.player.config.ts   # M5: Single-File-Build → dist-player/
    │   ├── Dockerfile · nginx.conf               # M5: Frontend-Image
    │   └── test/           # engine, impl-run, end-to-end, export
    └── agent/              # M3–M5: Generator-Agent + Persistenz + Export-Endpoint
        ├── src/tools.ts    # list_modules / get_module_schema / propose_app (+ Validator-Loop)
        ├── src/loop.ts     # modell-agnostischer Tool-Use-Loop (mit Mock testbar)
        ├── src/anthropic.ts# realer ModelCaller (claude-opus-4-8)
        ├── src/store/      # SpecStore: File (default) + Prisma (Postgres) + Auswahl per Env
        ├── src/server.ts   # /api/generate, /api/apps (+Versionen, +Export), /api/modules|health
        ├── prisma/ · Dockerfile                  # M5: Postgres-Schema + Backend-Image
        └── test/           # tools, loop, store, server (inject)
```

## Lokal ausführen

```bash
# Backend (braucht ANTHROPIC_API_KEY für echte Generierung)
ANTHROPIC_API_KEY=sk-... npm run start -w @processfox/agent   # Port 8787

# Frontend (Generator + Player); /api wird auf das Backend geproxyt
npm run dev -w @processfox/runtime                            # Port 5173
```

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
- **Persistenz (V1):** File-Store (`FileSpecStore`, versionierte JSON-Specs auf Volume).
  PostgreSQL+Prisma-Pfad ist im Code vorhanden, aber dormant (über `DATABASE_URL`
  reaktivierbar). Auth nur für Ersteller.

---

## 6. Deployment (Coolify / Hetzner)

**Images werden in GitHub Actions gebaut** (`.github/workflows/deploy.yml`) und nach GHCR
gepusht; Coolify **zieht** sie nur (Build-Pack „Docker Compose"). So baut die 4-GB-Box
nichts — entscheidend, weil der Vite-Build dort sonst den RAM sprengt.

`docker-compose.yml`: zwei Services — `frontend` (Nginx, statische SPA + serviert
`/player.html` für den Export) und `backend` (Node/Fastify, File-Store auf Volume `pfdata`).
Kein Datenbank-Container in V1. Das Frontend veröffentlicht **keinen Host-Port** (`expose: 80`);
Coolifys Proxy routet die Domain dorthin und macht TLS. `ANTHROPIC_API_KEY` als Coolify-Env.
Exportierte Endnutzer-Apps sind eine einzelne HTML-Datei – keine Infrastruktur nötig.

Details und Schritt-für-Schritt: [DEPLOY.md](DEPLOY.md).

---

## 7. Modul-Roadmap V1 (browser-only)

- **Input:** XLSX-Upload ✅, CSV-Upload ✅, manuelles Formular (offen), Datei-Upload (offen)
- **Transform:** Spalten-Mapping ✅, Filter & Sortierung ✅
- **Output:** DOCX-Vorlage ✅, CSV-Export ✅, XLSX-Export ✅, PDF (offen), ZIP-Bündel (offen)

Modul-Code wird **lazy geladen** (ein Chunk pro Modul): Eine App lädt nur die
tatsächlich genutzten Module/Libs. Generator-Hauptbundle dadurch 822 kB → 222 kB;
`xlsx`/`docxtemplater` sind separate Chunks. (Der Single-File-Export bündelt
weiterhin alle Module — eine self-contained Datei; per-App-Slimming wäre ein
eigener Build und ist V2.)

---

## 8. Phasen / Meilensteine

1. **M1 – Fundament:** Modul-Contract, Typsystem, Validator, Registry (+ Beispielmodule). ✅
2. **M2 – Runtime/Player:** Manifest-Renderer + Datenfluss-Panel. ✅
3. **M3 – Generator-Agent:** Tool-Use-Loop, Prompt → Manifest, Live-Vorschau. ✅
4. **M4 – Editor:** Design-Anpassung (Theme-Tokens), Persistenz/Versionierung. ✅
5. **M5 – Export & Coolify-Deployment.** ✅
6. **M6 – Modul-Ausbau + Härtung (Lazy-Loading).** ✅

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
├── README.md · CLAUDE.md   # Überblick · Arbeitsleitfaden
├── DEPLOY.md               # M5: Coolify/Docker-Anleitung
├── docker-compose.yml      # M5: frontend + backend (image:-basiert, Coolify zieht)
├── .github/workflows/deploy.yml   # M5: CI baut Images → GHCR
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
    │   ├── Dockerfile · nginx.conf               # M5: Frontend-Image (baut SPA + Player)
    │   └── test/           # engine, impl-run, end-to-end, export
    └── agent/              # M3–M5: Generator-Agent + Persistenz
        ├── src/tools.ts    # list_modules / get_module_schema / propose_app (+ Validator-Loop)
        ├── src/loop.ts     # modell-agnostischer Tool-Use-Loop (mit Mock testbar)
        ├── src/anthropic.ts# realer ModelCaller (claude-opus-4-8)
        ├── src/store/      # SpecStore: File (V1-Default) + Prisma (dormant) + Auswahl per Env
        ├── src/server.ts   # /api/generate, /api/apps (+Versionen), /api/modules|health
        ├── prisma/ · Dockerfile                  # Schema (dormant) · Backend-Image (Node, kein Vite)
        └── test/           # tools, loop, store, server (inject)
```

## Lokal ausführen

```bash
# Backend (braucht ANTHROPIC_API_KEY für echte Generierung)
ANTHROPIC_API_KEY=sk-... npm run start -w @processfox/agent   # Port 8787

# Frontend (Generator + Player); /api wird auf das Backend geproxyt
npm run dev -w @processfox/runtime                            # Port 5173
```

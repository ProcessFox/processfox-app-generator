# CLAUDE.md

Guidance for working in this repository.

## What this is

**ProcessFox** — a business-app generator (à la Lovable/Base44) that, instead of
generating code, composes apps from **predefined, typed modules**. V1 modules run
**entirely in the user's browser** (no server, no LLM at app runtime).

See [PLAN.md](PLAN.md) for the architecture and milestones, [README.md](README.md)
for the overview, [DEPLOY.md](DEPLOY.md) for deployment.

## The one invariant

> The KI agent does **not** generate code. It emits a **declarative JSON manifest**
> that selects, configures and wires predefined modules. Every manifest is
> validated before use. This is what makes data flow transparent and the apps safe.

If you're tempted to make the agent write/exec code, or to bypass the validator —
don't. That breaks the core value proposition.

## Monorepo layout (npm workspaces)

```
packages/
  core/      Framework-agnostic foundation (NO React/DOM). Module contract, port
             type system, manifest, registry, validator, theme, export logic.
  runtime/   React + Vite + Tailwind. Execution engine, module implementations
             (run + ui), Player, editor, generator UI, standalone player + export.
  agent/     Node + Fastify backend. Claude tool-use loop (prompt → validated
             manifest), persistence (SpecStore), export endpoint.
```

**Dependency direction:** `runtime` and `agent` depend on `core`. `core` depends
on nothing app-specific. Never import React/DOM into `core`, and never import the
agent into the runtime (or vice versa).

## Commands

```bash
npm install                              # workspaces

npm test                                 # all packages
npm run test -w @processfox/core         # one package
npm run typecheck                        # all packages (tsc --noEmit, strict)

npm run dev   -w @processfox/runtime     # generator frontend → :5173 (proxies /api → :8787)
npm run start -w @processfox/agent       # backend → :8787 (needs ANTHROPIC_API_KEY for /api/generate)

npm run build        -w @processfox/runtime   # generator SPA (code-split)
npm run build:player -w @processfox/runtime   # standalone single-file player → dist-player/
npm run export       -w @processfox/runtime -- <template.html> <manifest.json> <out.html>
```

Verify with the preview tools (a dev server via `.claude/launch.json` config
`runtime`), not by asking the user to check manually.

## Architecture rules (keep these intact)

- **Module = definition + implementation, split deliberately.**
  - `core/src/modules/<id>.ts` — the `ModuleDefinition` (metadata, typed ports,
    Zod config schema, dependencies). No React, testable in Node.
  - `runtime/src/impl/<name>.run.ts` — the browser `run` function. No React.
  - `runtime/src/impl/<name>.ui.tsx` — the React `ui`.
  - This split keeps `core` and the `run` logic unit-testable without a DOM.
- **Lazy loading.** Implementations are loaded via `runtime/src/impl/loaders.ts`
  (dynamic `import()`), so each module is its own chunk. The generator bundle stays
  small. Do **not** add a static eager import of all implementations into the app
  graph (it would re-bloat the bundle). `impl/runners.ts` is eager but **test-only**.
- **Typed ports.** Connections are validated by `isAssignable` in
  `core/src/ports.ts`; the engine coerces values in `runtime/src/engine/coerce.ts`.
  Keep the type-level and value-level rules in sync.
- **Manifest = single source of truth**, versioned (`MANIFEST_SCHEMA_VERSION`).
  Module versioning is **semver-major** compatible (see `validator.ts`).
- **Design adjustable, mechanics locked.** Only theme tokens (`core/src/theme.ts`)
  are editable; ports/run/config are not. UIs consume CSS vars (`var(--pf-accent)`).
- **Agent is model-agnostic.** `agent/src/loop.ts` runs against a `ModelCaller`
  interface; `anthropic.ts` is the real one. Tests inject a mock — never call the
  real API in tests.
- **Export logic lives in `core`** (`core/src/export.ts`), not runtime, so the
  backend can use it without pulling in React.

## Adding a module

1. `core/src/modules/<id>.ts` — define it; add to `builtinModules` in
   `core/src/modules/index.ts`.
2. `runtime/src/impl/<name>.run.ts` + `<name>.ui.tsx`.
3. Register a loader in `runtime/src/impl/loaders.ts` and the eager
   `runtime/src/impl/runners.ts` (for tests).
4. Tests: a `run` unit test (Node) and, ideally, an engine/pipeline test.

## Models / Claude API

When touching the agent, default to `claude-opus-4-8`. The tool-use loop is a
plain Messages-API loop (no thinking config needed); the system prompt lives in
`agent/src/loop.ts`. Keep instructions calibrated — do not add "CRITICAL/MUST"
over-steering.

## Gotchas

- **One Vite version.** `vitest` pulled Vite 5 and `runtime` wanted Vite 6 →
  type-identity clash in `vite.config.ts`. Everything is pinned to **Vite 5**;
  keep it aligned if you bump.
- **Persistence is the file store; Postgres/Prisma is dormant.** V1 deploys with
  `FileSpecStore` (JSON under `PROCESSFOX_DATA_DIR`, on a volume). `prismaStore.ts` +
  `prisma/schema.prisma` remain in the repo but are NOT wired into the build (no prisma
  dep, no `prisma generate`). `createStore()` would switch to Prisma if `DATABASE_URL`
  is set — re-adding it means restoring the prisma deps + a generate step. `prismaStore.ts`
  loads `@prisma/client` via a non-literal dynamic import, so the build stays green without it.
- **Export is one file.** The standalone player is built with
  `inlineDynamicImports` so `vite-plugin-singlefile` can inline everything; the
  exported app therefore bundles all module code (self-contained by design).
- **U+2028/2029 + `<` escaping** in `core/src/export.ts` is load-bearing for safe
  manifest embedding — don't "simplify" it away.

## Verification expectations

After changes: run `npm test` and `npm run typecheck`. For previewable UI changes,
start the `runtime` preview and confirm visually. Report failures with output;
don't claim done without running the checks.

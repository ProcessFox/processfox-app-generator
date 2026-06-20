import { readFile } from 'node:fs/promises';
import Fastify from 'fastify';
import {
  ModuleRegistry,
  builtinModules,
  validateManifest,
  injectManifest,
  type AppManifest,
} from '@processfox/core';
import { runAgent, type ModelCaller } from './loop.js';
import { createAnthropicCaller } from './anthropic.js';
import { createStore } from './store/createStore.js';
import type { SpecStore } from './store/types.js';

export interface ServerOptions {
  /** Persistence backend. Defaults to a file store under PROCESSFOX_DATA_DIR. */
  store?: SpecStore;
  /** Model caller override (tests inject a mock; default is the Anthropic SDK). */
  modelCaller?: ModelCaller;
  /** Skip the API-key gate (tests). */
  requireApiKey?: boolean;
}

/**
 * Generator + persistence backend. The Anthropic API key never leaves here.
 *   GET  /api/health
 *   GET  /api/modules
 *   POST /api/generate            { prompt } -> { manifest, valid, errors, ... }
 *   POST /api/apps                { name?, manifest } -> { id, version }
 *   POST /api/apps/:id/versions   { manifest } -> { id, version }
 *   GET  /api/apps                -> StoredApp[]
 *   GET  /api/apps/:id            -> { app, versions }
 *   GET  /api/apps/:id/versions/:v-> AppManifest
 */
export function buildServer(options: ServerOptions = {}) {
  const app = Fastify({ logger: true });
  const registry = new ModuleRegistry(builtinModules);
  const store = options.store ?? createStore();
  const requireApiKey = options.requireApiKey ?? true;

  /** Validate a manifest payload; returns errors to send (or null when valid). */
  function manifestErrors(manifest: unknown): string[] | null {
    if (manifest == null || typeof manifest !== 'object') return ['manifest (object) is required'];
    const { valid, errors } = validateManifest(manifest as AppManifest, registry);
    return valid ? null : errors.map((e) => e.message);
  }

  app.get('/api/health', async () => ({
    ok: true,
    hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
  }));

  app.get('/api/modules', async () => ({ modules: registry.catalog() }));

  app.post<{ Body: { prompt?: string } }>('/api/generate', async (request, reply) => {
    const prompt = request.body?.prompt;
    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      return reply.code(400).send({ error: 'prompt (non-empty string) is required' });
    }
    const caller = options.modelCaller;
    if (!caller && requireApiKey && !process.env.ANTHROPIC_API_KEY) {
      return reply.code(503).send({ error: 'ANTHROPIC_API_KEY is not configured on the server' });
    }
    return runAgent(prompt, registry, caller ?? createAnthropicCaller());
  });

  app.post<{ Body: { name?: string; manifest?: unknown } }>('/api/apps', async (request, reply) => {
    const errors = manifestErrors(request.body?.manifest);
    if (errors) return reply.code(400).send({ error: 'Invalid manifest', details: errors });
    return store.createApp(request.body!.manifest as AppManifest, request.body?.name);
  });

  app.post<{ Params: { id: string }; Body: { manifest?: unknown } }>(
    '/api/apps/:id/versions',
    async (request, reply) => {
      const errors = manifestErrors(request.body?.manifest);
      if (errors) return reply.code(400).send({ error: 'Invalid manifest', details: errors });
      const existing = await store.getApp(request.params.id);
      if (!existing) return reply.code(404).send({ error: `App "${request.params.id}" not found` });
      return store.addVersion(request.params.id, request.body!.manifest as AppManifest);
    },
  );

  app.get('/api/apps', async () => ({ apps: await store.listApps() }));

  app.get<{ Params: { id: string } }>('/api/apps/:id', async (request, reply) => {
    const found = await store.getApp(request.params.id);
    if (!found) return reply.code(404).send({ error: `App "${request.params.id}" not found` });
    return found;
  });

  app.get<{ Params: { id: string; v: string } }>(
    '/api/apps/:id/versions/:v',
    async (request, reply) => {
      const manifest = await store.getVersion(request.params.id, Number(request.params.v));
      if (!manifest) return reply.code(404).send({ error: 'Version not found' });
      return manifest;
    },
  );

  // Export one version as a standalone single-file HTML app (file://-openable).
  app.get<{ Params: { id: string; v: string } }>(
    '/api/apps/:id/versions/:v/export',
    async (request, reply) => {
      const manifest = await store.getVersion(request.params.id, Number(request.params.v));
      if (!manifest) return reply.code(404).send({ error: 'Version not found' });

      const templatePath = process.env.PROCESSFOX_PLAYER_TEMPLATE;
      if (!templatePath) {
        return reply
          .code(503)
          .send({ error: 'Export template not configured (PROCESSFOX_PLAYER_TEMPLATE)' });
      }
      let template: string;
      try {
        template = await readFile(templatePath, 'utf8');
      } catch {
        return reply.code(503).send({ error: 'Export template file not found' });
      }

      const safeName = (manifest.name || 'app').replace(/[^\w.-]+/g, '_').slice(0, 60);
      return reply
        .header('content-type', 'text/html; charset=utf-8')
        .header('content-disposition', `attachment; filename="${safeName}.html"`)
        .send(injectManifest(template, manifest));
    },
  );

  return app;
}

// Run directly (tsx src/server.ts)
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 8787);
  buildServer()
    .listen({ port, host: '0.0.0.0' })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

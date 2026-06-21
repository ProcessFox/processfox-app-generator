import Fastify from 'fastify';
import {
  ModuleRegistry,
  builtinModules,
  validateManifest,
  type AppManifest,
} from '@processfox/core';
import { runAgent, type AgentEvent, type ModelCaller } from './loop.js';
import { ConversationStore } from './conversations.js';
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
 *   POST /api/generate/stream     { prompt, conversationId? } -> SSE progress + { done }
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
  const conversations = new ConversationStore(registry);
  const requireApiKey = options.requireApiKey ?? true;

  /** True when generation can run (a caller is injected or an API key exists). */
  function canGenerate(): boolean {
    return Boolean(options.modelCaller) || !requireApiKey || Boolean(process.env.ANTHROPIC_API_KEY);
  }

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
    if (!canGenerate()) {
      return reply.code(503).send({ error: 'ANTHROPIC_API_KEY is not configured on the server' });
    }
    return runAgent(prompt, registry, options.modelCaller ?? createAnthropicCaller());
  });

  /**
   * Streaming generation + multi-turn editing. Server-Sent Events: emits the
   * conversation id, then agent progress events (so the UI shows "thinking"
   * live), then a final { type: 'done', result }. Pass conversationId to refine
   * the app built in a previous turn.
   */
  app.post<{ Body: { prompt?: string; conversationId?: string } }>(
    '/api/generate/stream',
    async (request, reply) => {
      const prompt = request.body?.prompt;
      if (typeof prompt !== 'string' || prompt.trim().length === 0) {
        return reply.code(400).send({ error: 'prompt (non-empty string) is required' });
      }
      if (!canGenerate()) {
        return reply.code(503).send({ error: 'ANTHROPIC_API_KEY is not configured on the server' });
      }

      reply.raw.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
      });
      const send = (data: unknown) => reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);

      const { id, conversation } = conversations.resolve(request.body?.conversationId);
      send({ type: 'conversation', conversationId: id });

      const caller = options.modelCaller ?? createAnthropicCaller();
      try {
        const result = await conversation.send(prompt, caller, {
          onEvent: (event: AgentEvent) => send(event),
        });
        send({ type: 'done', result });
      } catch (err) {
        request.log.error(err);
        send({ type: 'error', error: err instanceof Error ? err.message : String(err) });
      } finally {
        reply.raw.end();
      }
      return reply;
    },
  );

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

  // Note: app export is done client-side in the browser (the frontend serves the
  // single-file player at /player.html; the SPA injects the manifest and downloads
  // it). The backend therefore needs no Vite build and no template file.

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

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MANIFEST_SCHEMA_VERSION, type AppManifest } from '@processfox/core';
import { buildServer } from '../src/server.js';
import { FileSpecStore } from '../src/store/fileStore.js';
import { TOOL_NAMES } from '../src/tools.js';
import type { LlmTurn, ModelCaller } from '../src/loop.js';

const validManifest: AppManifest = {
  id: 'a',
  name: 'Produktliste → Word',
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  nodes: [
    { instanceId: 'u', moduleId: 'xlsx-upload', moduleVersion: '1.0.0', config: {} },
    {
      instanceId: 'd',
      moduleId: 'docx-template',
      moduleVersion: '1.0.0',
      config: { templateAssetId: 't' },
    },
  ],
  edges: [
    { id: 'e', from: { instanceId: 'u', portId: 'table' }, to: { instanceId: 'd', portId: 'records' } },
  ],
};

const toolUse = (id: string, name: string, input: unknown): LlmTurn => ({
  blocks: [{ type: 'tool_use', id, name, input }],
  raw: [{ type: 'tool_use', id, name, input }],
  stopReason: 'tool_use',
});

async function makeServer(modelCaller?: ModelCaller) {
  const dir = await mkdtemp(join(tmpdir(), 'processfox-srv-'));
  return buildServer({ store: new FileSpecStore(dir), modelCaller, requireApiKey: false });
}

let app: Awaited<ReturnType<typeof buildServer>>;

beforeEach(async () => {
  app = await makeServer();
});

describe('server: persistence routes', () => {
  it('saves a valid manifest and reads versions back', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/apps',
      payload: { name: 'Demo', manifest: validManifest },
    });
    expect(create.statusCode).toBe(200);
    const { id, version } = create.json() as { id: string; version: number };
    expect(version).toBe(1);

    const v2 = await app.inject({
      method: 'POST',
      url: `/api/apps/${id}/versions`,
      payload: { manifest: validManifest },
    });
    expect((v2.json() as { version: number }).version).toBe(2);

    const get = await app.inject({ method: 'GET', url: `/api/apps/${id}` });
    expect((get.json() as { versions: number[] }).versions).toEqual([1, 2]);

    const list = await app.inject({ method: 'GET', url: '/api/apps' });
    expect((list.json() as { apps: unknown[] }).apps).toHaveLength(1);
  });

  it('rejects an invalid manifest with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/apps',
      payload: { manifest: { ...validManifest, edges: [] } }, // docx.records unwired
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { details: string[] }).details.length).toBeGreaterThan(0);
  });

  it('404s adding a version to an unknown app', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/apps/app_missing/versions',
      payload: { manifest: validManifest },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('server: generate route', () => {
  it('runs the agent with an injected model caller', async () => {
    let i = 0;
    const turns: LlmTurn[] = [
      toolUse('t1', TOOL_NAMES.proposeApp, { manifest: validManifest }),
      { blocks: [{ type: 'text', text: 'Fertig.' }], raw: [{ type: 'text', text: 'Fertig.' }], stopReason: 'end_turn' },
    ];
    const caller: ModelCaller = async () => turns[i++] ?? turns[1]!;
    const server = await makeServer(caller);

    const res = await server.inject({
      method: 'POST',
      url: '/api/generate',
      payload: { prompt: 'Excel zu Word' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { valid: boolean; manifest: AppManifest | null };
    expect(body.valid).toBe(true);
    expect(body.manifest?.nodes).toHaveLength(2);
  });

  it('400s on an empty prompt', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/generate', payload: { prompt: '' } });
    expect(res.statusCode).toBe(400);
  });
});

/** Parse an SSE payload string into the array of JSON event objects. */
function parseSse(payload: string): Array<Record<string, unknown>> {
  return payload
    .split('\n\n')
    .map((b) => b.trim())
    .filter((b) => b.startsWith('data:'))
    .map((b) => JSON.parse(b.slice('data:'.length).trim()));
}

describe('server: streaming generate route', () => {
  it('streams progress and refines across turns sharing a conversationId', async () => {
    const renamed: AppManifest = { ...validManifest, name: 'Umbenannt' };
    let i = 0;
    const turns: LlmTurn[] = [
      toolUse('t1', TOOL_NAMES.proposeApp, { manifest: validManifest }),
      { blocks: [{ type: 'text', text: 'Fertig.' }], raw: [{ type: 'text', text: 'Fertig.' }], stopReason: 'end_turn' },
      toolUse('t2', TOOL_NAMES.proposeApp, { manifest: renamed }),
      { blocks: [{ type: 'text', text: 'Geändert.' }], raw: [{ type: 'text', text: 'Geändert.' }], stopReason: 'end_turn' },
    ];
    const caller: ModelCaller = async () => turns[i++] ?? turns[turns.length - 1]!;
    const server = await makeServer(caller);

    const first = await server.inject({
      method: 'POST',
      url: '/api/generate/stream',
      payload: { prompt: 'Excel zu Word' },
    });
    expect(first.statusCode).toBe(200);
    const firstEvents = parseSse(first.payload);
    const convEvent = firstEvents.find((e) => e.type === 'conversation');
    const conversationId = convEvent?.conversationId as string;
    expect(conversationId).toMatch(/^conv_/);
    expect(firstEvents.some((e) => e.type === 'validation' && e.valid === true)).toBe(true);
    const firstDone = firstEvents.find((e) => e.type === 'done') as
      | { result: { manifest: AppManifest | null } }
      | undefined;
    expect(firstDone?.result.manifest?.name).toBe('Produktliste → Word');

    const second = await server.inject({
      method: 'POST',
      url: '/api/generate/stream',
      payload: { prompt: 'Umbenennen', conversationId },
    });
    const secondDone = parseSse(second.payload).find((e) => e.type === 'done') as
      | { result: { manifest: AppManifest | null } }
      | undefined;
    expect(secondDone?.result.manifest?.name).toBe('Umbenannt');
  });

  it('400s on an empty prompt', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/generate/stream',
      payload: { prompt: '' },
    });
    expect(res.statusCode).toBe(400);
  });
});

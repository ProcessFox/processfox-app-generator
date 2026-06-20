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

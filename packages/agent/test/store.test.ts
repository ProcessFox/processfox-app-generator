import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MANIFEST_SCHEMA_VERSION, type AppManifest } from '@processfox/core';
import { FileSpecStore } from '../src/store/fileStore.js';
import { AppNotFoundError } from '../src/store/types.js';

const manifest = (name: string): AppManifest => ({
  id: 'ignored',
  name,
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  nodes: [{ instanceId: 'u', moduleId: 'xlsx-upload', moduleVersion: '1.0.0', config: {} }],
  edges: [],
});

let store: FileSpecStore;

beforeEach(async () => {
  const dir = await mkdtemp(join(tmpdir(), 'processfox-store-'));
  store = new FileSpecStore(dir);
});

describe('FileSpecStore', () => {
  it('creates an app at version 1 and reads it back', async () => {
    const { id, version } = await store.createApp(manifest('Demo'));
    expect(version).toBe(1);

    const loaded = await store.getVersion(id, 1);
    expect(loaded?.name).toBe('Demo');

    const app = await store.getApp(id);
    expect(app?.app.latestVersion).toBe(1);
    expect(app?.versions).toEqual([1]);
  });

  it('appends immutable versions', async () => {
    const { id } = await store.createApp(manifest('v1'));
    const second = await store.addVersion(id, manifest('v2'));
    expect(second.version).toBe(2);

    const app = await store.getApp(id);
    expect(app?.versions).toEqual([1, 2]);
    expect((await store.getVersion(id, 1))?.name).toBe('v1'); // v1 unchanged
    expect((await store.getVersion(id, 2))?.name).toBe('v2');
  });

  it('lists stored apps', async () => {
    await store.createApp(manifest('A'));
    await store.createApp(manifest('B'));
    const apps = await store.listApps();
    expect(apps.map((a) => a.name).sort()).toEqual(['A', 'B']);
  });

  it('throws for addVersion on an unknown app', async () => {
    await expect(store.addVersion('app_missing', manifest('x'))).rejects.toBeInstanceOf(
      AppNotFoundError,
    );
  });

  it('returns null for an unknown version', async () => {
    const { id } = await store.createApp(manifest('A'));
    expect(await store.getVersion(id, 99)).toBeNull();
  });
});

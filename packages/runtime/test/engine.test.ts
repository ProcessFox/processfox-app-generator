import { describe, it, expect } from 'vitest';
import {
  ModuleRegistry,
  builtinModules,
  MANIFEST_SCHEMA_VERSION,
  type AppManifest,
} from '@processfox/core';
import {
  executeManifest,
  ManifestInvalidError,
  MissingImplementationError,
  type RunFn,
  type TableValue,
} from '../src/engine/index.js';
import { referenceManifest } from '../src/manifest/reference.js';

const registry = new ModuleRegistry(builtinModules);
const ctx = { inputs: {}, loadAsset: () => new ArrayBuffer(0) };

describe('executeManifest', () => {
  it('runs nodes in topological order and threads port values', async () => {
    const order: string[] = [];
    let recordsSeen: unknown;

    const runners = new Map<string, RunFn>([
      [
        'xlsx-upload',
        async () => {
          order.push('upload');
          return { table: { columns: ['Artikelname'], rows: [{ Artikelname: 'X' }] } };
        },
      ],
      [
        'field-mapping',
        async ({ inputs }) => {
          order.push('map');
          return { out: (inputs.in as TableValue).rows };
        },
      ],
      [
        'docx-template',
        async ({ inputs }) => {
          order.push('docx');
          recordsSeen = inputs.records;
          return { document: { files: [] } };
        },
      ],
    ]);

    await executeManifest(referenceManifest(), registry, runners, ctx);

    expect(order).toEqual(['upload', 'map', 'docx']);
    expect(recordsSeen).toEqual([{ Artikelname: 'X' }]);
  });

  it('coerces table → recordList across an edge', async () => {
    let recordsSeen: unknown;
    const manifest: AppManifest = {
      id: 'a',
      name: 'direct',
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
    const runners = new Map<string, RunFn>([
      ['xlsx-upload', async () => ({ table: { columns: ['x'], rows: [{ x: 1 }, { x: 2 }] } })],
      [
        'docx-template',
        async ({ inputs }) => {
          recordsSeen = inputs.records;
          return { document: { files: [] } };
        },
      ],
    ]);

    await executeManifest(manifest, registry, runners, ctx);
    expect(recordsSeen).toEqual([{ x: 1 }, { x: 2 }]); // .rows, not the table object
  });

  it('throws ManifestInvalidError for an invalid manifest', async () => {
    const m = referenceManifest();
    m.nodes[0]!.moduleId = 'nope';
    await expect(executeManifest(m, registry, new Map(), ctx)).rejects.toBeInstanceOf(
      ManifestInvalidError,
    );
  });

  it('throws MissingImplementationError when a runner is absent', async () => {
    const runners = new Map<string, RunFn>([
      ['xlsx-upload', async () => ({ table: { columns: [], rows: [] } })],
      ['field-mapping', async () => ({ out: [] })],
      // docx-template intentionally missing
    ]);
    await expect(
      executeManifest(referenceManifest(), registry, runners, ctx),
    ).rejects.toBeInstanceOf(MissingImplementationError);
  });
});

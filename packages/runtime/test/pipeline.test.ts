import { describe, it, expect } from 'vitest';
import {
  ModuleRegistry,
  builtinModules,
  MANIFEST_SCHEMA_VERSION,
  validateManifest,
  type AppManifest,
} from '@processfox/core';
import { executeManifest, type BinaryValue } from '../src/engine/index.js';
import { runners } from '../src/impl/runners.js';

const registry = new ModuleRegistry(builtinModules);

/** CSV-Upload → Filter → CSV-Export, exercising table→recordList coercion. */
const manifest: AppManifest = {
  id: 'p',
  name: 'CSV → Filter → CSV',
  schemaVersion: MANIFEST_SCHEMA_VERSION,
  nodes: [
    { instanceId: 'up', moduleId: 'csv-upload', moduleVersion: '1.0.0', config: {} },
    {
      instanceId: 'flt',
      moduleId: 'filter',
      moduleVersion: '1.0.0',
      config: { where: { field: 'status', op: 'eq', value: 'open' }, sortBy: 'id', sortDir: 'asc' },
    },
    {
      instanceId: 'out',
      moduleId: 'csv-export',
      moduleVersion: '1.0.0',
      config: { filename: 'gefiltert.csv' },
    },
  ],
  edges: [
    { id: 'e1', from: { instanceId: 'up', portId: 'table' }, to: { instanceId: 'flt', portId: 'in' } },
    { id: 'e2', from: { instanceId: 'flt', portId: 'out' }, to: { instanceId: 'out', portId: 'records' } },
  ],
};

describe('end-to-end: CSV → Filter → CSV', () => {
  it('validates as a well-formed app', () => {
    expect(validateManifest(manifest, registry).valid).toBe(true);
  });

  it('filters and re-exports the rows', async () => {
    const results = await executeManifest(manifest, registry, runners, {
      inputs: { up: 'id,status\n2,open\n1,closed\n3,open' },
      loadAsset: () => new ArrayBuffer(0),
    });
    const doc = results.out!.document as BinaryValue;
    const csv = new TextDecoder().decode(doc.files[0]!.data);
    // only "open" rows, sorted by id ascending
    expect(csv).toBe('id,status\n2,open\n3,open');
  });
});

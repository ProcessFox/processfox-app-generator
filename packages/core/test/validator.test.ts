import { describe, it, expect } from 'vitest';
import {
  ModuleRegistry,
  builtinModules,
  validateManifest,
  MANIFEST_SCHEMA_VERSION,
  type AppManifest,
} from '../src/index.js';

const registry = new ModuleRegistry(builtinModules);

/** The reference V1 app: XLSX-Upload → Spalten-Mapping → DOCX-Vorlage. */
function referenceManifest(): AppManifest {
  return {
    id: 'app_1',
    name: 'Produktliste → Word',
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    nodes: [
      {
        instanceId: 'n_upload',
        moduleId: 'xlsx-upload',
        moduleVersion: '1.0.0',
        config: { sheet: 0, hasHeaderRow: true },
      },
      {
        instanceId: 'n_map',
        moduleId: 'field-mapping',
        moduleVersion: '1.0.0',
        config: { mappings: { Artikelname: 'name', Preis: 'price' }, dropUnmapped: true },
      },
      {
        instanceId: 'n_docx',
        moduleId: 'docx-template',
        moduleVersion: '1.0.0',
        config: {
          templateAssetId: 'asset_42',
          mode: 'per-record',
          filenamePattern: 'Produkt-{name}.docx',
        },
      },
    ],
    edges: [
      {
        id: 'e1',
        from: { instanceId: 'n_upload', portId: 'table' },
        to: { instanceId: 'n_map', portId: 'in' },
      },
      {
        id: 'e2',
        from: { instanceId: 'n_map', portId: 'out' },
        to: { instanceId: 'n_docx', portId: 'records' },
      },
    ],
  };
}

const codes = (m: AppManifest) => validateManifest(m, registry).errors.map((e) => e.code);

describe('validateManifest', () => {
  it('accepts the reference XLSX → mapping → DOCX app', () => {
    const result = validateManifest(referenceManifest(), registry);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('flags an unknown module', () => {
    const m = referenceManifest();
    m.nodes[0]!.moduleId = 'does-not-exist';
    expect(codes(m)).toContain('unknown_module');
  });

  it('flags a major version mismatch', () => {
    const m = referenceManifest();
    m.nodes[0]!.moduleVersion = '2.0.0'; // registry is 1.0.0 → breaking
    expect(codes(m)).toContain('module_version_mismatch');
  });

  it('accepts a same-major minor/patch version difference', () => {
    const m = referenceManifest();
    m.nodes[0]!.moduleVersion = '1.4.2'; // registry 1.0.0, same major → ok
    expect(validateManifest(m, registry).valid).toBe(true);
  });

  it('flags invalid config (missing required templateAssetId)', () => {
    const m = referenceManifest();
    m.nodes[2]!.config = { mode: 'per-record' };
    expect(codes(m)).toContain('invalid_config');
  });

  it('flags duplicate instance ids', () => {
    const m = referenceManifest();
    m.nodes[1]!.instanceId = 'n_upload';
    expect(codes(m)).toContain('duplicate_instance_id');
  });

  it('flags an edge to an unknown port', () => {
    const m = referenceManifest();
    m.edges[0]!.to.portId = 'nope';
    expect(codes(m)).toContain('unknown_port');
  });

  it('flags a type mismatch (table → binary)', () => {
    const m = referenceManifest();
    // wire upload.table directly into docx.records is fine (table→recordList),
    // but wiring into the document OUTPUT port is impossible; instead force a
    // genuine mismatch: connect upload.table → docx has no text input, so we
    // simulate by pointing a text-incompatible edge.
    m.edges = [
      {
        id: 'bad',
        from: { instanceId: 'n_docx', portId: 'document' }, // binary
        to: { instanceId: 'n_map', portId: 'in' }, // expects table
      },
      ...m.edges,
    ];
    expect(codes(m)).toContain('type_mismatch');
  });

  it('flags a missing required input', () => {
    const m = referenceManifest();
    m.edges = m.edges.filter((e) => e.id !== 'e2'); // disconnect docx.records
    expect(codes(m)).toContain('missing_required_input');
  });

  it('flags an over-connected input port', () => {
    const m = referenceManifest();
    m.edges.push({
      id: 'e3',
      from: { instanceId: 'n_upload', portId: 'table' },
      to: { instanceId: 'n_map', portId: 'in' }, // already fed by e1
    });
    expect(codes(m)).toContain('input_port_overconnected');
  });

  it('detects a cycle', () => {
    const m = referenceManifest();
    // make n_docx feed back into n_map (types ignored for the cycle check itself)
    m.nodes.push({
      instanceId: 'n_extra',
      moduleId: 'field-mapping',
      moduleVersion: '1.0.0',
      config: { mappings: { a: 'b' }, dropUnmapped: true },
    });
    m.edges.push(
      {
        id: 'c1',
        from: { instanceId: 'n_map', portId: 'out' },
        to: { instanceId: 'n_extra', portId: 'in' },
      },
      {
        id: 'c2',
        from: { instanceId: 'n_extra', portId: 'out' },
        to: { instanceId: 'n_map', portId: 'in' },
      },
    );
    expect(codes(m)).toContain('cycle_detected');
  });

  it('accepts table → recordList coercion', () => {
    const m = referenceManifest();
    // feed upload.table directly into docx.records (recordList) — coercion allowed
    m.nodes = m.nodes.filter((n) => n.instanceId !== 'n_map');
    m.edges = [
      {
        id: 'e1',
        from: { instanceId: 'n_upload', portId: 'table' },
        to: { instanceId: 'n_docx', portId: 'records' },
      },
    ];
    expect(validateManifest(m, registry).valid).toBe(true);
  });
});

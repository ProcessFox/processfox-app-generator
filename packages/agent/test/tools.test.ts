import { describe, it, expect } from 'vitest';
import {
  ModuleRegistry,
  builtinModules,
  MANIFEST_SCHEMA_VERSION,
  type AppManifest,
} from '@processfox/core';
import { GeneratorSession } from '../src/session.js';
import { dispatchTool, TOOL_NAMES } from '../src/tools.js';

function session() {
  return new GeneratorSession(new ModuleRegistry(builtinModules));
}

const validManifest: AppManifest = {
  id: 'a',
  name: 'demo',
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

describe('dispatchTool', () => {
  it('list_modules returns the catalog', () => {
    const res = dispatchTool(session(), TOOL_NAMES.listModules, {});
    expect(res.isError).toBe(false);
    const modules = (res.content as { modules: Array<{ id: string }> }).modules;
    expect(modules.map((m) => m.id)).toContain('xlsx-upload');
  });

  it('get_module_schema returns ports + JSON config schema', () => {
    const res = dispatchTool(session(), TOOL_NAMES.getModuleSchema, { moduleId: 'docx-template' });
    expect(res.isError).toBe(false);
    const content = res.content as Record<string, unknown>;
    expect(content.outputs).toBeDefined();
    expect((content.configSchema as Record<string, unknown>).type).toBe('object');
  });

  it('get_module_schema errors on unknown module', () => {
    const res = dispatchTool(session(), TOOL_NAMES.getModuleSchema, { moduleId: 'ghost' });
    expect(res.isError).toBe(true);
  });

  it('propose_app reports a valid manifest', () => {
    const s = session();
    const res = dispatchTool(s, TOOL_NAMES.proposeApp, { manifest: validManifest });
    expect(res.isError).toBe(false);
    expect((res.content as { valid: boolean }).valid).toBe(true);
    expect(s.lastValid).toEqual(validManifest);
  });

  it('propose_app returns errors for an invalid manifest (no tool error)', () => {
    const broken = { ...validManifest, edges: [] };
    const res = dispatchTool(session(), TOOL_NAMES.proposeApp, { manifest: broken });
    expect(res.isError).toBe(false); // a validation failure is not a tool error
    const content = res.content as { valid: boolean; errors: unknown[] };
    expect(content.valid).toBe(false);
    expect(content.errors.length).toBeGreaterThan(0);
  });

  it('unknown tool name is a tool error', () => {
    const res = dispatchTool(session(), 'nope', {});
    expect(res.isError).toBe(true);
  });
});

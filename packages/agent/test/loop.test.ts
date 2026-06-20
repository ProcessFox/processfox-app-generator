import { describe, it, expect } from 'vitest';
import {
  ModuleRegistry,
  builtinModules,
  MANIFEST_SCHEMA_VERSION,
  type AppManifest,
} from '@processfox/core';
import { runAgent, type LlmTurn, type ModelCaller, type ModelRequest } from '../src/loop.js';
import { TOOL_NAMES } from '../src/tools.js';

const registry = new ModuleRegistry(builtinModules);

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

const finalText = (text: string): LlmTurn => ({
  blocks: [{ type: 'text', text }],
  raw: [{ type: 'text', text }],
  stopReason: 'end_turn',
});

function scriptedCaller(turns: LlmTurn[]) {
  const requests: ModelRequest[] = [];
  let i = 0;
  const caller: ModelCaller = async (req) => {
    // Snapshot messages: the loop mutates the same array reference across calls.
    requests.push({ system: req.system, tools: req.tools, messages: [...req.messages] });
    return turns[i++] ?? finalText('');
  };
  return { caller, requests };
}

describe('runAgent', () => {
  it('drives a self-correcting tool-use loop to a valid manifest', async () => {
    const brokenManifest = { ...validManifest, edges: [] }; // missing required input

    const { caller, requests } = scriptedCaller([
      toolUse('t1', TOOL_NAMES.listModules, {}),
      toolUse('t2', TOOL_NAMES.getModuleSchema, { moduleId: 'xlsx-upload' }),
      toolUse('t3', TOOL_NAMES.proposeApp, { manifest: brokenManifest }), // invalid
      toolUse('t4', TOOL_NAMES.proposeApp, { manifest: validManifest }), // fixed
      finalText('Die App liest eine Excel-Liste und erzeugt Word-Dokumente.'),
    ]);

    const result = await runAgent('Excel zu Word', registry, caller);

    expect(result.valid).toBe(true);
    expect(result.manifest).toEqual(validManifest);
    expect(result.finalText).toContain('Word-Dokumente');
    expect(result.steps).toBe(5);

    // The invalid validation result was fed back to the model before it retried.
    const afterInvalid = requests[3]!; // request that produced turn t4
    const lastMsg = afterInvalid.messages.at(-1)!;
    const toolResults = lastMsg.content as Array<{ content: string }>;
    expect(JSON.parse(toolResults[0]!.content)).toMatchObject({ valid: false });
  });

  it('returns no manifest and surfaces errors when never valid', async () => {
    const broken = { ...validManifest, edges: [] };
    const { caller } = scriptedCaller([
      toolUse('t1', TOOL_NAMES.proposeApp, { manifest: broken }),
      finalText('Konnte keine gültige App bauen.'),
    ]);

    const result = await runAgent('kaputt', registry, caller);
    expect(result.valid).toBe(false);
    expect(result.manifest).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('respects maxSteps', async () => {
    // A model that always calls a tool would loop forever without the cap.
    const caller: ModelCaller = async () => toolUse('x', TOOL_NAMES.listModules, {});
    const result = await runAgent('endlos', registry, caller, { maxSteps: 3 });
    expect(result.steps).toBe(3);
    expect(result.valid).toBe(false);
  });
});

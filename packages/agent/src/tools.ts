import type { AppManifest } from '@processfox/core';
import { configJsonSchema } from './jsonSchema.js';
import type { GeneratorSession } from './session.js';

/** Provider-agnostic tool definition (matches the Anthropic tool shape). */
export interface AgentToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/** Result of dispatching a tool call. `isError` maps to tool_result.is_error. */
export interface ToolDispatchResult {
  content: unknown;
  isError: boolean;
}

export const TOOL_NAMES = {
  listModules: 'list_modules',
  getModuleSchema: 'get_module_schema',
  proposeApp: 'propose_app',
} as const;

/**
 * The three tools the generator agent gets. It does not write code — it lists
 * modules, inspects their schemas, and proposes a manifest that is validated on
 * every call so the agent can self-correct.
 */
export const agentTools: AgentToolDef[] = [
  {
    name: TOOL_NAMES.listModules,
    description:
      'List all available ProcessFox modules with id, version, category and description. Call this first to see what building blocks exist.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: TOOL_NAMES.getModuleSchema,
    description:
      'Get the full schema of one module: its input/output ports (with types) and the JSON Schema of its config. Use before wiring a module so you know its ports and required config.',
    input_schema: {
      type: 'object',
      properties: {
        moduleId: { type: 'string', description: 'The module id, e.g. "xlsx-upload".' },
      },
      required: ['moduleId'],
      additionalProperties: false,
    },
  },
  {
    name: TOOL_NAMES.proposeApp,
    description:
      'Propose a full app manifest. It is validated immediately; the result reports whether it is valid and, if not, the exact errors to fix. Iterate until valid. Only use existing module ids and connect compatible ports.',
    input_schema: {
      type: 'object',
      properties: {
        manifest: {
          type: 'object',
          description: 'The full AppManifest.',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            schemaVersion: { type: 'number' },
            nodes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  instanceId: { type: 'string' },
                  moduleId: { type: 'string' },
                  moduleVersion: { type: 'string' },
                  config: { type: 'object' },
                },
                required: ['instanceId', 'moduleId', 'moduleVersion', 'config'],
              },
            },
            edges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  from: {
                    type: 'object',
                    properties: { instanceId: { type: 'string' }, portId: { type: 'string' } },
                    required: ['instanceId', 'portId'],
                  },
                  to: {
                    type: 'object',
                    properties: { instanceId: { type: 'string' }, portId: { type: 'string' } },
                    required: ['instanceId', 'portId'],
                  },
                },
                required: ['id', 'from', 'to'],
              },
            },
          },
          required: ['id', 'name', 'schemaVersion', 'nodes', 'edges'],
        },
      },
      required: ['manifest'],
      additionalProperties: false,
    },
  },
];

/**
 * Dispatches a tool call against the session. Pure (no I/O beyond the registry),
 * so it is unit-testable without an LLM.
 */
export function dispatchTool(
  session: GeneratorSession,
  name: string,
  input: unknown,
): ToolDispatchResult {
  switch (name) {
    case TOOL_NAMES.listModules:
      return { content: { modules: session.registry.catalog() }, isError: false };

    case TOOL_NAMES.getModuleSchema: {
      const moduleId = (input as { moduleId?: unknown })?.moduleId;
      if (typeof moduleId !== 'string') {
        return { content: { error: 'moduleId (string) is required' }, isError: true };
      }
      const def = session.registry.get(moduleId);
      if (!def) {
        return { content: { error: `Unknown module "${moduleId}"` }, isError: true };
      }
      return {
        content: {
          id: def.id,
          version: def.version,
          category: def.category,
          title: def.title,
          description: def.description,
          usage: def.usage,
          inputs: def.inputs,
          outputs: def.outputs,
          dependencies: def.dependencies,
          credentials: def.credentials,
          configSchema: configJsonSchema(def.configSchema),
        },
        isError: false,
      };
    }

    case TOOL_NAMES.proposeApp: {
      const manifest = (input as { manifest?: unknown })?.manifest;
      if (manifest == null || typeof manifest !== 'object') {
        return { content: { error: 'manifest (object) is required' }, isError: true };
      }
      const { valid, errors } = session.propose(manifest as AppManifest);
      // A failed validation is NOT a tool error — return the errors so the agent
      // can fix them and call propose_app again.
      return { content: { valid, errors }, isError: false };
    }

    default:
      return { content: { error: `Unknown tool "${name}"` }, isError: true };
  }
}

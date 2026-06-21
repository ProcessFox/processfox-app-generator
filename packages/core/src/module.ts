/**
 * Module contract.
 *
 * A `ModuleDefinition` is the framework-agnostic half of a module: metadata,
 * typed ports, a config schema, declared dependencies and credential needs.
 * The implementation half (the React `ui` and the browser `run` function) lives
 * in the runtime package and is bound to a definition by `id` — keeping `core`
 * free of any DOM/React dependency so it can be reused by the backend agent and
 * tested in plain Node.
 */

import type { ZodTypeAny } from 'zod';
import type { Port } from './ports.js';

export const MODULE_CATEGORIES = ['input', 'transform', 'output', 'credentials'] as const;
export type ModuleCategory = (typeof MODULE_CATEGORIES)[number];

/**
 * Declares a credential a module needs to run. Always empty in V1 (browser-only,
 * no server, no LLM) — present so later server/LLM modules dock in cleanly.
 */
export interface CredentialSpec {
  id: string;
  label: string;
  /** e.g. "apiKey" | "oauth" — free-form for now, formalized when V2 adds them. */
  kind: string;
}

export interface ModuleDefinition {
  /** Stable module id, e.g. "xlsx-upload". */
  id: string;
  /** Semantic version of this module definition. */
  version: string;
  category: ModuleCategory;
  /** Short title shown in the editor / palette. */
  title: string;
  /** Description handed to the KI agent to decide when to use this module. */
  description: string;
  /**
   * Guidance for the KI agent on *how* to use this module: when to pick it,
   * how to choose its config, typical setups and pitfalls. Surfaced via
   * `get_module_schema` so the agent can make concrete, well-configured
   * suggestions to the user. Plain prose; may be multi-line.
   */
  usage?: string;
  /** Typed inputs. Input modules usually have none. */
  inputs: Port[];
  /** Typed outputs. Output modules usually have none. */
  outputs: Port[];
  /**
   * Zod schema for this module's instance config. Used to validate the config a
   * node carries in the manifest. (A JSON-Schema export for the agent is derived
   * from this in a later phase.)
   */
  configSchema: ZodTypeAny;
  /** npm packages the runtime must load to execute this module. */
  dependencies: string[];
  /** Credentials required to run. Empty in V1. */
  credentials: CredentialSpec[];
}

export function getInputPort(def: ModuleDefinition, portId: string): Port | undefined {
  return def.inputs.find((p) => p.id === portId);
}

export function getOutputPort(def: ModuleDefinition, portId: string): Port | undefined {
  return def.outputs.find((p) => p.id === portId);
}

/** An input port is required unless it explicitly opts out. */
export function isRequiredInput(port: Port): boolean {
  return port.required !== false;
}

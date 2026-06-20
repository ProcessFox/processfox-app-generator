/**
 * Execution-engine contract. A `ModuleImplementation` binds a runtime `run`
 * function (and, in the React layer, a `ui`) to a ModuleDefinition by id. `run`
 * is deliberately free of React so it can be unit-tested in plain Node.
 */

import type { ModuleInstance } from '@processfox/core';

/**
 * Side-channel the player provides to `run`:
 * - `inputs`: raw user-supplied values per *input-node* instanceId (e.g. an
 *   uploaded File / ArrayBuffer). Input modules read from here.
 * - `loadAsset`: resolves a config-referenced asset (e.g. a DOCX template) the
 *   creator/end-user provided, by id.
 */
export interface ExecutionContext {
  inputs: Record<string, unknown>;
  loadAsset: (assetId: string) => ArrayBuffer | Promise<ArrayBuffer>;
}

export interface RunArgs {
  node: ModuleInstance;
  /** This node's config (already validated against its schema). */
  config: Record<string, unknown>;
  /** Resolved input-port values, keyed by input portId. */
  inputs: Record<string, unknown>;
  ctx: ExecutionContext;
}

/** Executes a single module instance, returning its output-port values. */
export type RunFn = (args: RunArgs) => Promise<Record<string, unknown>>;

/** instanceId -> (portId -> value) produced during a run. */
export type ExecutionResults = Record<string, Record<string, unknown>>;

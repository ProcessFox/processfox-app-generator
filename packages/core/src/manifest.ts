/**
 * App manifest — the declarative spec the KI agent produces and the runtime
 * executes. This is the single source of truth for a generated app: a typed DAG
 * of module instances ("nodes") plus their wiring ("edges").
 */

import type { ThemeTokens } from './theme.js';

/** Current manifest schema version. Bump when the shape changes (→ migrations). */
export const MANIFEST_SCHEMA_VERSION = 1 as const;

/** One placed module instance in the app graph. */
export interface ModuleInstance {
  /** Unique within the manifest. */
  instanceId: string;
  /** References a ModuleDefinition.id in the registry. */
  moduleId: string;
  /** Pin the module version this app was built against (for reproducibility). */
  moduleVersion: string;
  /** Instance config; validated against the module's configSchema. */
  config: Record<string, unknown>;
  /** Optional per-instance design overrides (layered on top of the app theme). */
  design?: Partial<ThemeTokens>;
}

/** A typed connection from one node's output port to another's input port. */
export interface Connection {
  id: string;
  from: { instanceId: string; portId: string };
  to: { instanceId: string; portId: string };
}

export interface AppManifest {
  /** Manifest / app id. */
  id: string;
  /** Human-readable app name. */
  name: string;
  schemaVersion: typeof MANIFEST_SCHEMA_VERSION;
  nodes: ModuleInstance[];
  edges: Connection[];
  /** Optional app-wide theme tokens (base for per-node `design` overrides). */
  theme?: Partial<ThemeTokens>;
}

/**
 * Manifest validator.
 *
 * Resolves a manifest against a registry and proves it is a runnable app:
 * every node references a known module, every config matches its schema, every
 * edge connects compatible ports, required inputs are wired, and the graph is a
 * DAG. The KI agent calls this after each `propose_app` and self-corrects from
 * the returned errors.
 */

import { ModuleRegistry } from './registry.js';
import { isRequiredInput, getInputPort, getOutputPort } from './module.js';
import { isAssignable } from './ports.js';
import { MANIFEST_SCHEMA_VERSION, type AppManifest } from './manifest.js';

export type ValidationCode =
  | 'schema_version'
  | 'duplicate_instance_id'
  | 'unknown_module'
  | 'module_version_mismatch'
  | 'invalid_config'
  | 'duplicate_edge_id'
  | 'unknown_node'
  | 'unknown_port'
  | 'type_mismatch'
  | 'missing_required_input'
  | 'input_port_overconnected'
  | 'cycle_detected';

export interface ValidationError {
  code: ValidationCode;
  message: string;
  /** Where the problem is, when applicable — helps the agent target a fix. */
  instanceId?: string;
  edgeId?: string;
  portId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateManifest(
  manifest: AppManifest,
  registry: ModuleRegistry,
): ValidationResult {
  const errors: ValidationError[] = [];

  if (manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    errors.push({
      code: 'schema_version',
      message: `Unsupported manifest schemaVersion ${manifest.schemaVersion}; expected ${MANIFEST_SCHEMA_VERSION}`,
    });
  }

  // --- Nodes: unique ids, known modules, version match, valid config ---
  const nodeIds = new Set<string>();
  for (const node of manifest.nodes) {
    if (nodeIds.has(node.instanceId)) {
      errors.push({
        code: 'duplicate_instance_id',
        message: `Duplicate instanceId "${node.instanceId}"`,
        instanceId: node.instanceId,
      });
      continue;
    }
    nodeIds.add(node.instanceId);

    const def = registry.get(node.moduleId);
    if (!def) {
      errors.push({
        code: 'unknown_module',
        message: `Node "${node.instanceId}" references unknown module "${node.moduleId}"`,
        instanceId: node.instanceId,
      });
      continue;
    }

    // Semver-compatible: a pinned version is accepted when its MAJOR matches the
    // registry's. Same-major minor/patch updates are non-breaking by contract;
    // a different (or unparseable) major is a breaking mismatch and errors.
    if (!isMajorCompatible(node.moduleVersion, def.version)) {
      errors.push({
        code: 'module_version_mismatch',
        message: `Node "${node.instanceId}" pins module "${node.moduleId}" v${node.moduleVersion}, incompatible with registry v${def.version} (major version differs)`,
        instanceId: node.instanceId,
      });
    }

    const parsed = def.configSchema.safeParse(node.config);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ');
      errors.push({
        code: 'invalid_config',
        message: `Invalid config for node "${node.instanceId}" (${node.moduleId}): ${issues}`,
        instanceId: node.instanceId,
      });
    }
  }

  // Map instanceId -> moduleId for edge resolution (only valid, known nodes).
  const nodeModule = new Map<string, string>();
  for (const node of manifest.nodes) {
    if (registry.has(node.moduleId)) nodeModule.set(node.instanceId, node.moduleId);
  }

  // --- Edges: unique ids, resolvable endpoints, type compatibility ---
  const edgeIds = new Set<string>();
  // input port "instanceId#portId" -> count of incoming connections
  const incomingByInputPort = new Map<string, number>();

  for (const edge of manifest.edges) {
    if (edgeIds.has(edge.id)) {
      errors.push({
        code: 'duplicate_edge_id',
        message: `Duplicate edge id "${edge.id}"`,
        edgeId: edge.id,
      });
      continue;
    }
    edgeIds.add(edge.id);

    const fromModuleId = nodeModule.get(edge.from.instanceId);
    const toModuleId = nodeModule.get(edge.to.instanceId);

    if (!fromModuleId) {
      errors.push({
        code: 'unknown_node',
        message: `Edge "${edge.id}" starts at unknown node "${edge.from.instanceId}"`,
        edgeId: edge.id,
        instanceId: edge.from.instanceId,
      });
    }
    if (!toModuleId) {
      errors.push({
        code: 'unknown_node',
        message: `Edge "${edge.id}" ends at unknown node "${edge.to.instanceId}"`,
        edgeId: edge.id,
        instanceId: edge.to.instanceId,
      });
    }
    if (!fromModuleId || !toModuleId) continue;

    const outPort = getOutputPort(registry.getOrThrow(fromModuleId), edge.from.portId);
    const inPort = getInputPort(registry.getOrThrow(toModuleId), edge.to.portId);

    if (!outPort) {
      errors.push({
        code: 'unknown_port',
        message: `Edge "${edge.id}": module "${fromModuleId}" has no output port "${edge.from.portId}"`,
        edgeId: edge.id,
        instanceId: edge.from.instanceId,
        portId: edge.from.portId,
      });
    }
    if (!inPort) {
      errors.push({
        code: 'unknown_port',
        message: `Edge "${edge.id}": module "${toModuleId}" has no input port "${edge.to.portId}"`,
        edgeId: edge.id,
        instanceId: edge.to.instanceId,
        portId: edge.to.portId,
      });
    }
    if (!outPort || !inPort) continue;

    const inputKey = `${edge.to.instanceId}#${edge.to.portId}`;
    incomingByInputPort.set(inputKey, (incomingByInputPort.get(inputKey) ?? 0) + 1);

    if (!isAssignable(outPort.type, inPort.type)) {
      errors.push({
        code: 'type_mismatch',
        message: `Edge "${edge.id}": "${outPort.type}" output is not assignable to "${inPort.type}" input`,
        edgeId: edge.id,
      });
    }
  }

  // An input port carries a single value: at most one incoming connection.
  for (const [key, count] of incomingByInputPort) {
    if (count > 1) {
      const [instanceId, portId] = key.split('#');
      errors.push({
        code: 'input_port_overconnected',
        message: `Input port "${portId}" on node "${instanceId}" has ${count} connections (max 1)`,
        instanceId,
        portId,
      });
    }
  }

  // --- Required inputs must be wired ---
  for (const node of manifest.nodes) {
    const def = registry.get(node.moduleId);
    if (!def) continue;
    for (const port of def.inputs) {
      if (!isRequiredInput(port)) continue;
      const key = `${node.instanceId}#${port.id}`;
      if ((incomingByInputPort.get(key) ?? 0) === 0) {
        errors.push({
          code: 'missing_required_input',
          message: `Required input "${port.id}" on node "${node.instanceId}" (${node.moduleId}) is not connected`,
          instanceId: node.instanceId,
          portId: port.id,
        });
      }
    }
  }

  // --- Acyclicity (DAG) via Kahn's algorithm over valid nodes/edges ---
  if (hasCycle(manifest, nodeModule)) {
    errors.push({
      code: 'cycle_detected',
      message: 'The app graph contains a cycle; data flow must be acyclic',
    });
  }

  return { valid: errors.length === 0, errors };
}

/** Major component of a semver string, or NaN if it can't be parsed. */
function majorOf(version: string): number {
  const first = version.split('.')[0] ?? '';
  return /^\d+$/.test(first) ? Number(first) : Number.NaN;
}

/** True when both versions parse and share the same major component. */
function isMajorCompatible(pinned: string, registry: string): boolean {
  const a = majorOf(pinned);
  const b = majorOf(registry);
  return Number.isFinite(a) && Number.isFinite(b) && a === b;
}

function hasCycle(
  manifest: AppManifest,
  nodeModule: Map<string, string>,
): boolean {
  const nodes = [...nodeModule.keys()];
  const indegree = new Map<string, number>(nodes.map((n) => [n, 0]));
  const adjacency = new Map<string, string[]>(nodes.map((n) => [n, []]));

  for (const edge of manifest.edges) {
    const from = edge.from.instanceId;
    const to = edge.to.instanceId;
    if (!nodeModule.has(from) || !nodeModule.has(to)) continue;
    adjacency.get(from)!.push(to);
    indegree.set(to, (indegree.get(to) ?? 0) + 1);
  }

  const queue = nodes.filter((n) => (indegree.get(n) ?? 0) === 0);
  let visited = 0;
  while (queue.length > 0) {
    const n = queue.shift()!;
    visited++;
    for (const next of adjacency.get(n) ?? []) {
      const d = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  return visited !== nodes.length;
}

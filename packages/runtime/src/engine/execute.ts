/**
 * Manifest execution engine.
 *
 * Validates the manifest against the registry, orders the nodes topologically,
 * then runs each module — resolving its input-port values from upstream outputs
 * (coercing where the validator allowed it) and collecting its output-port
 * values. The whole thing runs in the browser; nothing is sent anywhere.
 */

import {
  validateManifest,
  getOutputPort,
  getInputPort,
  type AppManifest,
  type ModuleRegistry,
  type ValidationError,
} from '@processfox/core';
import { coerce } from './coerce.js';
import type { ExecutionContext, ExecutionResults, RunFn } from './types.js';

export class ManifestInvalidError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super(`Manifest is invalid: ${errors.map((e) => e.message).join('; ')}`);
    this.name = 'ManifestInvalidError';
  }
}

export class MissingImplementationError extends Error {
  constructor(moduleId: string) {
    super(`No runtime implementation registered for module "${moduleId}"`);
    this.name = 'MissingImplementationError';
  }
}

export async function executeManifest(
  manifest: AppManifest,
  registry: ModuleRegistry,
  runners: Map<string, RunFn>,
  ctx: ExecutionContext,
): Promise<ExecutionResults> {
  const validation = validateManifest(manifest, registry);
  if (!validation.valid) throw new ManifestInvalidError(validation.errors);

  const order = topologicalOrder(manifest);
  const results: ExecutionResults = {};

  for (const instanceId of order) {
    const node = manifest.nodes.find((n) => n.instanceId === instanceId)!;
    const def = registry.getOrThrow(node.moduleId);

    const run = runners.get(node.moduleId);
    if (!run) throw new MissingImplementationError(node.moduleId);

    // Resolve input-port values from incoming edges.
    const inputs: Record<string, unknown> = {};
    for (const edge of manifest.edges) {
      if (edge.to.instanceId !== instanceId) continue;
      const upstream = manifest.nodes.find((n) => n.instanceId === edge.from.instanceId)!;
      const upstreamDef = registry.getOrThrow(upstream.moduleId);
      const outPort = getOutputPort(upstreamDef, edge.from.portId)!;
      const inPort = getInputPort(def, edge.to.portId)!;
      const raw = results[edge.from.instanceId]?.[edge.from.portId];
      inputs[edge.to.portId] = coerce(raw, outPort.type, inPort.type);
    }

    results[instanceId] = await run({ node, config: node.config, inputs, ctx });
  }

  return results;
}

/** Kahn's algorithm; assumes the validator already rejected cycles. */
export function topologicalOrder(manifest: AppManifest): string[] {
  const ids = manifest.nodes.map((n) => n.instanceId);
  const indegree = new Map<string, number>(ids.map((id) => [id, 0]));
  const adjacency = new Map<string, string[]>(ids.map((id) => [id, []]));

  for (const edge of manifest.edges) {
    adjacency.get(edge.from.instanceId)?.push(edge.to.instanceId);
    indegree.set(edge.to.instanceId, (indegree.get(edge.to.instanceId) ?? 0) + 1);
  }

  const queue = ids.filter((id) => (indegree.get(id) ?? 0) === 0);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adjacency.get(id) ?? []) {
      const d = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  return order;
}

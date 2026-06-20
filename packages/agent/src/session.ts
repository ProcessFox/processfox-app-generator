import {
  validateManifest,
  type AppManifest,
  type ModuleRegistry,
  type ValidationError,
} from '@processfox/core';

/**
 * Holds the state of one generation run: the registry the agent picks from, the
 * most recently proposed manifest, and the most recent *valid* one. The agent
 * proposes manifests repeatedly; we keep the last valid result as the answer.
 */
export class GeneratorSession {
  lastProposed: AppManifest | null = null;
  lastValid: AppManifest | null = null;

  constructor(readonly registry: ModuleRegistry) {}

  /** Validate a proposed manifest, remembering it (and the last valid one). */
  propose(manifest: AppManifest): { valid: boolean; errors: ValidationError[] } {
    this.lastProposed = manifest;
    const { valid, errors } = validateManifest(manifest, this.registry);
    if (valid) this.lastValid = manifest;
    return { valid, errors };
  }
}

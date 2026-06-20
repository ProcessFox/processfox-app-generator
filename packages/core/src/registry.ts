/**
 * Module registry — the catalog of available module definitions. The KI agent
 * lists/queries it to pick modules; the validator resolves manifest nodes
 * against it.
 */

import type { ModuleDefinition } from './module.js';

export class ModuleRegistry {
  private readonly modules = new Map<string, ModuleDefinition>();

  constructor(initial: ModuleDefinition[] = []) {
    for (const def of initial) this.register(def);
  }

  /** Register a module. Throws on duplicate id. */
  register(def: ModuleDefinition): void {
    if (this.modules.has(def.id)) {
      throw new Error(`Module "${def.id}" is already registered`);
    }
    this.modules.set(def.id, def);
  }

  has(id: string): boolean {
    return this.modules.has(id);
  }

  get(id: string): ModuleDefinition | undefined {
    return this.modules.get(id);
  }

  getOrThrow(id: string): ModuleDefinition {
    const def = this.modules.get(id);
    if (!def) throw new Error(`Unknown module "${id}"`);
    return def;
  }

  list(): ModuleDefinition[] {
    return [...this.modules.values()];
  }

  /** Lightweight catalog for the agent: id, version, category, title, description. */
  catalog(): Array<Pick<ModuleDefinition, 'id' | 'version' | 'category' | 'title' | 'description'>> {
    return this.list().map(({ id, version, category, title, description }) => ({
      id,
      version,
      category,
      title,
      description,
    }));
  }
}

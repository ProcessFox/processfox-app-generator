import type { ComponentType } from 'react';
import type { RunFn } from '../engine/types.js';
import type { NodeUiProps } from '../ui/types.js';

/** Binds a runtime `run` and a React `ui` to a module id. */
export interface ModuleImplementation {
  moduleId: string;
  run: RunFn;
  ui: ComponentType<NodeUiProps>;
}

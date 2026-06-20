import type { ModuleDefinition, ModuleInstance } from '@processfox/core';

/** Props every module UI receives from the player. */
export interface NodeUiProps {
  node: ModuleInstance;
  definition: ModuleDefinition;
  /** Whether this input node already has user-supplied data. */
  inputProvided: boolean;
  /** Input modules call this to hand their raw value to the player. */
  provideInput: (value: unknown) => void;
  /** Which config-referenced assets are present (e.g. a DOCX template). */
  assetsProvided: Record<string, boolean>;
  /** Modules with a config asset call this to register the uploaded bytes. */
  provideAsset: (assetId: string, buffer: ArrayBuffer) => void;
  /** Output-port values after a run, if any. */
  result?: Record<string, unknown>;
}

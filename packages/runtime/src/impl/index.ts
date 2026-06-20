import type { ComponentType } from 'react';
import type { RunFn } from '../engine/types.js';
import type { NodeUiProps } from '../ui/types.js';

import { xlsxUploadRun } from './xlsxUpload.run.js';
import { fieldMappingRun } from './fieldMapping.run.js';
import { docxTemplateRun } from './docxTemplate.run.js';
import { XlsxUploadUi } from './xlsxUpload.ui.js';
import { FieldMappingUi } from './fieldMapping.ui.js';
import { DocxTemplateUi } from './docxTemplate.ui.js';

/** Binds a runtime `run` and a React `ui` to a module id. */
export interface ModuleImplementation {
  moduleId: string;
  run: RunFn;
  ui: ComponentType<NodeUiProps>;
}

export const implementations = new Map<string, ModuleImplementation>([
  ['xlsx-upload', { moduleId: 'xlsx-upload', run: xlsxUploadRun, ui: XlsxUploadUi }],
  ['field-mapping', { moduleId: 'field-mapping', run: fieldMappingRun, ui: FieldMappingUi }],
  ['docx-template', { moduleId: 'docx-template', run: docxTemplateRun, ui: DocxTemplateUi }],
]);

/** Runner map for the engine (run functions only). */
export function runnersFrom(impls: Map<string, ModuleImplementation>): Map<string, RunFn> {
  return new Map([...impls].map(([id, impl]) => [id, impl.run]));
}

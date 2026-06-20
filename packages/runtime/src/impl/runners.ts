import type { RunFn } from '../engine/types.js';
import { xlsxUploadRun } from './xlsxUpload.run.js';
import { fieldMappingRun } from './fieldMapping.run.js';
import { docxTemplateRun } from './docxTemplate.run.js';

/** moduleId -> run function. Consumed by the execution engine (no React here). */
export const runners = new Map<string, RunFn>([
  ['xlsx-upload', xlsxUploadRun],
  ['field-mapping', fieldMappingRun],
  ['docx-template', docxTemplateRun],
]);

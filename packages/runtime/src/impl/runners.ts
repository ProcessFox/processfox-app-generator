import type { RunFn } from '../engine/types.js';
import { xlsxUploadRun } from './xlsxUpload.run.js';
import { csvUploadRun } from './csvUpload.run.js';
import { fieldMappingRun } from './fieldMapping.run.js';
import { filterRun } from './filter.run.js';
import { docxTemplateRun } from './docxTemplate.run.js';
import { csvExportRun } from './csvExport.run.js';
import { xlsxExportRun } from './xlsxExport.run.js';

/**
 * Eager runner map (run functions only, no UI/React). Used by tests and any
 * non-UI execution. The app itself uses the lazy loaders in `loaders.ts`.
 */
export const runners = new Map<string, RunFn>([
  ['xlsx-upload', xlsxUploadRun],
  ['csv-upload', csvUploadRun],
  ['field-mapping', fieldMappingRun],
  ['filter', filterRun],
  ['docx-template', docxTemplateRun],
  ['csv-export', csvExportRun],
  ['xlsx-export', xlsxExportRun],
]);

import type { ModuleDefinition } from '../module.js';
import { xlsxUpload } from './xlsx-upload.js';
import { csvUpload } from './csv-upload.js';
import { fieldMapping } from './field-mapping.js';
import { filter } from './filter.js';
import { docxTemplate } from './docx-template.js';
import { csvExport } from './csv-export.js';
import { xlsxExport } from './xlsx-export.js';

export { xlsxUpload, csvUpload, fieldMapping, filter, docxTemplate, csvExport, xlsxExport };

/** All built-in V1 module definitions. */
export const builtinModules: ModuleDefinition[] = [
  // input
  xlsxUpload,
  csvUpload,
  // transform
  fieldMapping,
  filter,
  // output
  docxTemplate,
  csvExport,
  xlsxExport,
];

import type { ModuleDefinition } from '../module.js';
import { xlsxUpload } from './xlsx-upload.js';
import { fieldMapping } from './field-mapping.js';
import { docxTemplate } from './docx-template.js';

export { xlsxUpload, fieldMapping, docxTemplate };

/** All built-in V1 module definitions. */
export const builtinModules: ModuleDefinition[] = [xlsxUpload, fieldMapping, docxTemplate];

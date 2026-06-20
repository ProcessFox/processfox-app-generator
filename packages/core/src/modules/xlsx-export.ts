import { z } from 'zod';
import type { ModuleDefinition } from '../module.js';

/**
 * Output module: write records to an .xlsx file the user downloads. Browser-only
 * (SheetJS). A good lazy-loading candidate — its dependency loads only when an
 * app actually uses this module.
 */
export const xlsxExport: ModuleDefinition = {
  id: 'xlsx-export',
  version: '1.0.0',
  category: 'output',
  title: 'XLSX-Export',
  description:
    'Writes a record list (or table) to a downloadable Excel (.xlsx) file. Use as the final step when the user wants the processed data back as a spreadsheet.',
  inputs: [{ id: 'records', label: 'Datensätze', type: 'recordList', required: true }],
  outputs: [{ id: 'document', label: 'Excel-Datei', type: 'binary' }],
  configSchema: z.object({
    sheetName: z.string().default('Daten'),
    filename: z.string().default('export.xlsx'),
  }),
  dependencies: ['xlsx'],
  credentials: [],
};

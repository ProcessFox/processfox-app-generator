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
  usage:
    'The final step when the user wants the processed data back as an Excel file. ' +
    'Set sheetName to something meaningful for the content (e.g. "Rechnungen"); it is the tab name inside the workbook. ' +
    'Give filename a descriptive, .xlsx-ending name (e.g. "auswertung.xlsx").',
  inputs: [{ id: 'records', label: 'Datensätze', type: 'recordList', required: true }],
  outputs: [{ id: 'document', label: 'Excel-Datei', type: 'binary' }],
  configSchema: z.object({
    sheetName: z.string().default('Daten').describe('Name of the worksheet (tab) inside the .xlsx file.'),
    filename: z.string().default('export.xlsx').describe('Download filename; should end in .xlsx.'),
  }),
  dependencies: ['xlsx'],
  credentials: [],
};

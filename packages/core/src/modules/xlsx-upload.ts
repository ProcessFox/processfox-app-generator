import { z } from 'zod';
import type { ModuleDefinition } from '../module.js';

/**
 * Input module: lets the end user upload an .xlsx file; parses the chosen sheet
 * into a table. Runs entirely in the browser (SheetJS) — no upload to a server.
 */
export const xlsxUpload: ModuleDefinition = {
  id: 'xlsx-upload',
  version: '1.0.0',
  category: 'input',
  title: 'XLSX-Upload',
  description:
    'Lets the user upload an Excel (.xlsx) file in the browser and reads a sheet into a table. Use as the data source when the user starts from a spreadsheet/product list. Output is tabular data with named columns.',
  inputs: [],
  outputs: [{ id: 'table', label: 'Tabelle', type: 'table' }],
  configSchema: z.object({
    /** Which sheet to read; index or name. Defaults to the first sheet. */
    sheet: z.union([z.number().int().nonnegative(), z.string()]).default(0),
    /** Whether the first row holds column headers. */
    hasHeaderRow: z.boolean().default(true),
  }),
  dependencies: ['xlsx'],
  credentials: [],
};

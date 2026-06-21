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
  usage:
    'The starting point when the user works from an Excel file. ' +
    'Leave sheet at 0 (first sheet) unless the user names a specific sheet. ' +
    'Keep hasHeaderRow=true for normal spreadsheets where row 1 holds the column names — those names become the table columns a downstream field-mapping refers to. ' +
    'Set hasHeaderRow=false only for raw data without a header row.',
  inputs: [],
  outputs: [{ id: 'table', label: 'Tabelle', type: 'table' }],
  configSchema: z.object({
    sheet: z
      .union([z.number().int().nonnegative(), z.string()])
      .default(0)
      .describe('Which sheet to read: 0-based index (0 = first sheet) or the sheet name as a string.'),
    hasHeaderRow: z
      .boolean()
      .default(true)
      .describe('true: the first row holds column headers (used as column names). false: data starts in row 1.'),
  }),
  dependencies: ['xlsx'],
  credentials: [],
};

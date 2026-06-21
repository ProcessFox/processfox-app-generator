import { z } from 'zod';
import type { ModuleDefinition } from '../module.js';

/**
 * Input module: upload a .csv file and parse it into a table. Browser-only.
 */
export const csvUpload: ModuleDefinition = {
  id: 'csv-upload',
  version: '1.0.0',
  category: 'input',
  title: 'CSV-Upload',
  description:
    'Lets the user upload a CSV file in the browser and parses it into a table with named columns. Use as the data source when the user starts from a CSV file.',
  usage:
    'The starting point when the user works from a CSV file. ' +
    'Keep hasHeaderRow=true for normal CSVs where row 1 holds the column names. ' +
    'Default delimiter is a comma; switch to ";" for typical German/Excel exports, or "\\t" for tab-separated files. If unsure, ask the user or keep the comma.',
  inputs: [],
  outputs: [{ id: 'table', label: 'Tabelle', type: 'table' }],
  configSchema: z.object({
    hasHeaderRow: z
      .boolean()
      .default(true)
      .describe('true: the first row holds column headers (used as column names). false: data starts in row 1.'),
    delimiter: z
      .string()
      .min(1)
      .default(',')
      .describe('Column separator. Common values: "," (default), ";" (German Excel exports), "\\t" (tab-separated).'),
  }),
  dependencies: [],
  credentials: [],
};

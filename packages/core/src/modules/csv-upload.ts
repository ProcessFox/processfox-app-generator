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
  inputs: [],
  outputs: [{ id: 'table', label: 'Tabelle', type: 'table' }],
  configSchema: z.object({
    hasHeaderRow: z.boolean().default(true),
    delimiter: z.string().min(1).default(','),
  }),
  dependencies: [],
  credentials: [],
};

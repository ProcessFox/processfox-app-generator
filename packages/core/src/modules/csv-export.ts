import { z } from 'zod';
import type { ModuleDefinition } from '../module.js';

/**
 * Output module: serialize records to a CSV file the user downloads. Browser-only.
 */
export const csvExport: ModuleDefinition = {
  id: 'csv-export',
  version: '1.0.0',
  category: 'output',
  title: 'CSV-Export',
  description:
    'Serializes a record list (or table) to a downloadable CSV file. Use as the final step when the user wants the processed data back as CSV.',
  inputs: [{ id: 'records', label: 'Datensätze', type: 'recordList', required: true }],
  outputs: [{ id: 'document', label: 'CSV-Datei', type: 'binary' }],
  configSchema: z.object({
    delimiter: z.string().min(1).default(','),
    filename: z.string().default('export.csv'),
  }),
  dependencies: [],
  credentials: [],
};

import { z } from 'zod';
import type { ModuleDefinition } from '../module.js';

/**
 * Output module: merges a list of records into a Word (.docx) template and lets
 * the user download the result. Runs in the browser (docxtemplater) — the
 * template and data never leave the machine.
 */
export const docxTemplate: ModuleDefinition = {
  id: 'docx-template',
  version: '1.0.0',
  category: 'output',
  title: 'DOCX-Vorlage',
  description:
    'Fills a Word (.docx) template with incoming records and offers the result as a download. Use as the final step when the user wants a cleanly formatted Word document from structured data. Accepts a record list (or a table).',
  inputs: [{ id: 'records', label: 'Datensätze', type: 'recordList', required: true }],
  outputs: [{ id: 'document', label: 'Word-Dokument', type: 'binary' }],
  configSchema: z.object({
    /** Reference to the uploaded template asset (resolved by the runtime). */
    templateAssetId: z.string().min(1),
    /** One document per record, or a single document looping over all records. */
    mode: z.enum(['per-record', 'single']).default('per-record'),
    /** Filename pattern; may reference fields, e.g. "Produkt-{sku}.docx". */
    filenamePattern: z.string().default('dokument-{index}.docx'),
  }),
  dependencies: ['docxtemplater', 'pizzip', 'file-saver'],
  credentials: [],
};

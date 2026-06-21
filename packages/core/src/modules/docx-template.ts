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
  usage:
    'The final step when the user wants formatted Word documents (letters, certificates, product sheets, contracts). ' +
    'The .docx template uses {placeholder} tags that must match the record field names feeding this module — so almost always put a field-mapping before it so its target fields equal the template placeholders. ' +
    'templateAssetId references a template the USER uploads; you cannot invent it. If none is set yet, propose the app anyway and tell the user to upload their .docx template. ' +
    'mode="per-record" produces one document per row (e.g. one letter per customer); mode="single" produces one document looping over all rows (e.g. a single catalog). ' +
    'filenamePattern may reference fields in {…}, e.g. "Brief-{nachname}.docx"; use {index} for the row number.',
  inputs: [{ id: 'records', label: 'Datensätze', type: 'recordList', required: true }],
  outputs: [{ id: 'document', label: 'Word-Dokument', type: 'binary' }],
  configSchema: z.object({
    templateAssetId: z
      .string()
      .min(1)
      .describe('Id of the .docx template uploaded by the user (resolved by the runtime). Cannot be invented by the agent.'),
    mode: z
      .enum(['per-record', 'single'])
      .default('per-record')
      .describe('per-record: one document per record (e.g. a letter per customer). single: one document looping over all records (e.g. one catalog).'),
    filenamePattern: z
      .string()
      .default('dokument-{index}.docx')
      .describe('Output filename; field placeholders in {…} are substituted, e.g. "Produkt-{sku}.docx". Use {index} for the row number.'),
  }),
  dependencies: ['docxtemplater', 'pizzip', 'file-saver'],
  credentials: [],
};

import { z } from 'zod';
import type { ModuleDefinition } from '../module.js';

/**
 * Transform module: maps/renames columns of an incoming table to the field names
 * a downstream template expects, optionally dropping unmapped columns. Pure
 * in-browser transform.
 */
export const fieldMapping: ModuleDefinition = {
  id: 'field-mapping',
  version: '1.0.0',
  category: 'transform',
  title: 'Spalten-Mapping',
  description:
    'Renames and selects columns of a table so they match the field names a downstream output module (e.g. a DOCX template) expects. Use to bridge spreadsheet column names and template placeholders.',
  usage:
    'Bridges the column names in the uploaded file and the field names a downstream module expects. ' +
    'Place it between an upload module and an output module (especially a DOCX template, whose placeholders are fixed). ' +
    'config.mappings is an object sourceColumn -> targetField, e.g. {"Artikelnr": "sku", "Bezeichnung": "name"}: the KEY is the exact column header from the uploaded file, the VALUE is the field name the next module uses. ' +
    'You usually do NOT know the real column headers at build time — ask the user which columns their file has, or propose a sensible mapping and tell the user to verify the left-hand (source) names against their file. ' +
    'Keep dropUnmapped=true to forward only the mapped fields (cleaner downstream); set it to false only when later steps still need the untouched columns.',
  inputs: [{ id: 'in', label: 'Tabelle', type: 'table', required: true }],
  outputs: [{ id: 'out', label: 'Datensätze', type: 'recordList' }],
  configSchema: z.object({
    mappings: z
      .record(z.string(), z.string())
      .describe(
        'Object mapping sourceColumn -> targetField. Key = exact column header in the uploaded file; value = field name the downstream module expects. Example: {"Artikelnr": "sku", "Bezeichnung": "name"}.',
      ),
    dropUnmapped: z
      .boolean()
      .default(true)
      .describe(
        'true: forward only the mapped fields (recommended). false: keep all original columns and just add the renamed ones.',
      ),
  }),
  dependencies: [],
  credentials: [],
};

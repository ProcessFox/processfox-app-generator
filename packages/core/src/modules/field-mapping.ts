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
  inputs: [{ id: 'in', label: 'Tabelle', type: 'table', required: true }],
  outputs: [{ id: 'out', label: 'Datensätze', type: 'recordList' }],
  configSchema: z.object({
    /** Map of sourceColumn -> targetField. */
    mappings: z.record(z.string(), z.string()),
    /** Drop columns not present in `mappings`. */
    dropUnmapped: z.boolean().default(true),
  }),
  dependencies: [],
  credentials: [],
};

import { z } from 'zod';
import type { ModuleDefinition } from '../module.js';

/**
 * Transform module: filter and/or sort a record list. Pure in-browser transform.
 */
export const filter: ModuleDefinition = {
  id: 'filter',
  version: '1.0.0',
  category: 'transform',
  title: 'Filter & Sortierung',
  description:
    'Filters rows by a condition and/or sorts them by a field. Use to narrow a list (e.g. only rows where status equals "open") or to order it before output.',
  usage:
    'Optional step to narrow and/or order records before output. ' +
    'where.field and sortBy must be field names that exist on the incoming records — i.e. the target field names produced by an upstream field-mapping, not the original column headers. If unsure which fields exist, ask the user. ' +
    'Omit where entirely to keep all rows; omit sortBy to keep the original order. ' +
    'Operators: eq/neq compare for (in)equality, contains is a substring match (text), gt/lt are greater/less-than (numbers are compared numerically when both sides look numeric). value is always given as a string.',
  inputs: [{ id: 'in', label: 'Datensätze', type: 'recordList', required: true }],
  outputs: [{ id: 'out', label: 'Datensätze', type: 'recordList' }],
  configSchema: z.object({
    where: z
      .object({
        field: z.string().min(1).describe('Field name to test (must exist on the incoming records).'),
        op: z
          .enum(['eq', 'neq', 'contains', 'gt', 'lt'])
          .describe('eq = equals, neq = not equals, contains = substring match, gt = greater than, lt = less than.'),
        value: z.string().describe('Comparison value, always as a string (e.g. "open", "100").'),
      })
      .optional()
      .describe('Keep only rows matching this condition. Omit to keep all rows.'),
    sortBy: z.string().optional().describe('Field name to sort by. Omit to keep the original order.'),
    sortDir: z.enum(['asc', 'desc']).default('asc').describe('Sort direction: asc = ascending, desc = descending.'),
  }),
  dependencies: [],
  credentials: [],
};

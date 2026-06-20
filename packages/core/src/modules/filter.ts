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
  inputs: [{ id: 'in', label: 'Datensätze', type: 'recordList', required: true }],
  outputs: [{ id: 'out', label: 'Datensätze', type: 'recordList' }],
  configSchema: z.object({
    where: z
      .object({
        field: z.string().min(1),
        op: z.enum(['eq', 'neq', 'contains', 'gt', 'lt']),
        value: z.string(),
      })
      .optional(),
    sortBy: z.string().optional(),
    sortDir: z.enum(['asc', 'desc']).default('asc'),
  }),
  dependencies: [],
  credentials: [],
};

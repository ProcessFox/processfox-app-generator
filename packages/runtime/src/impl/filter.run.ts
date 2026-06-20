import type { RunFn } from '../engine/types.js';
import type { RecordListValue } from '../engine/data.js';

type Op = 'eq' | 'neq' | 'contains' | 'gt' | 'lt';
interface Where {
  field: string;
  op: Op;
  value: string;
}

/** Numeric comparison when both sides parse as numbers, else locale string compare. */
function compareValues(a: unknown, b: unknown): number {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && a !== '' && b !== '') return na - nb;
  return String(a ?? '').localeCompare(String(b ?? ''));
}

function matches(cell: unknown, where: Where): boolean {
  const s = cell == null ? '' : String(cell);
  switch (where.op) {
    case 'eq':
      return s === where.value;
    case 'neq':
      return s !== where.value;
    case 'contains':
      return s.includes(where.value);
    case 'gt':
      return compareValues(cell, where.value) > 0;
    case 'lt':
      return compareValues(cell, where.value) < 0;
  }
}

/** Filters and/or sorts a record list. Pure in-browser transform. */
export const filterRun: RunFn = async ({ config, inputs }) => {
  let out = inputs.in as RecordListValue;
  const where = config.where as Where | undefined;
  const sortBy = config.sortBy as string | undefined;
  const sortDir = (config.sortDir as 'asc' | 'desc') ?? 'asc';

  if (where) out = out.filter((row) => matches(row[where.field], where));
  if (sortBy) {
    const factor = sortDir === 'desc' ? -1 : 1;
    out = [...out].sort((a, b) => compareValues(a[sortBy], b[sortBy]) * factor);
  }
  return { out };
};

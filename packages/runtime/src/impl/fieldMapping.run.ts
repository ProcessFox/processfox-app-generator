import type { RunFn } from '../engine/types.js';
import type { TableValue, RecordListValue } from '../engine/data.js';

/**
 * Renames/selects table columns into the field names a downstream template
 * expects. Pure in-browser transform.
 */
export const fieldMappingRun: RunFn = async ({ config, inputs }) => {
  const table = inputs.in as TableValue;
  const mappings = (config.mappings ?? {}) as Record<string, string>;
  const dropUnmapped = config.dropUnmapped !== false;

  const out: RecordListValue = table.rows.map((row) => {
    const record: Record<string, unknown> = dropUnmapped ? {} : { ...row };
    for (const [source, target] of Object.entries(mappings)) {
      if (source in row) record[target] = row[source];
    }
    return record;
  });

  return { out };
};

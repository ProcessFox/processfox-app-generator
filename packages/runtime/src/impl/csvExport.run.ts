import type { RunFn } from '../engine/types.js';
import type { RecordListValue, BinaryValue } from '../engine/data.js';
import { serializeCsv } from '../lib/csv.js';

/** Serializes records to a downloadable CSV file. */
export const csvExportRun: RunFn = async ({ config, inputs }) => {
  const records = inputs.records as RecordListValue;
  const delimiter = (config.delimiter as string) || ',';
  const filename = (config.filename as string) || 'export.csv';
  const data = new TextEncoder().encode(serializeCsv(records, delimiter));
  return { document: { files: [{ filename, data }] } satisfies BinaryValue };
};

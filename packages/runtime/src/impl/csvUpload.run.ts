import type { RunFn } from '../engine/types.js';
import { parseCsvToTable } from '../lib/csv.js';

async function toText(input: unknown): Promise<string> {
  if (typeof input === 'string') return input;
  if (input instanceof ArrayBuffer) return new TextDecoder().decode(input);
  if (input instanceof Uint8Array) return new TextDecoder().decode(input);
  if (typeof Blob !== 'undefined' && input instanceof Blob) return input.text();
  throw new Error('csv-upload: no file provided');
}

/** Parses an uploaded CSV into a table, fully in-browser. */
export const csvUploadRun: RunFn = async ({ node, config, ctx }) => {
  const text = await toText(ctx.inputs[node.instanceId]);
  const delimiter = (config.delimiter as string) || ',';
  const hasHeaderRow = config.hasHeaderRow !== false;
  return { table: parseCsvToTable(text, delimiter, hasHeaderRow) };
};

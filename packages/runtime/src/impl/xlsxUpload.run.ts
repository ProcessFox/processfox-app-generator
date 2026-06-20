import * as XLSX from 'xlsx';
import type { RunFn } from '../engine/types.js';
import type { TableValue } from '../engine/data.js';

/** Normalize whatever the UI handed us (File / Blob / ArrayBuffer / Uint8Array). */
async function toArrayBuffer(input: unknown): Promise<ArrayBuffer> {
  if (input instanceof ArrayBuffer) return input;
  if (input instanceof Uint8Array) {
    return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer;
  }
  if (typeof Blob !== 'undefined' && input instanceof Blob) return input.arrayBuffer();
  throw new Error('xlsx-upload: no file provided');
}

/**
 * Parses an uploaded .xlsx into a table, fully in-browser via SheetJS. Reads the
 * raw file from `ctx.inputs[instanceId]`.
 */
export const xlsxUploadRun: RunFn = async ({ node, config, ctx }) => {
  const buffer = await toArrayBuffer(ctx.inputs[node.instanceId]);
  const wb = XLSX.read(buffer, { type: 'array' });

  const sheetCfg = config.sheet as number | string;
  const sheetName =
    typeof sheetCfg === 'number' ? wb.SheetNames[sheetCfg] : sheetCfg;
  if (!sheetName || !wb.Sheets[sheetName]) {
    throw new Error(`xlsx-upload: sheet ${JSON.stringify(sheetCfg)} not found`);
  }
  const sheet = wb.Sheets[sheetName];
  const hasHeaderRow = config.hasHeaderRow !== false;

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    ...(hasHeaderRow ? {} : { header: 'A' as const }),
  });

  const columns: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }

  return { table: { columns, rows } satisfies TableValue };
};

import * as XLSX from 'xlsx';
import type { RunFn } from '../engine/types.js';
import type { RecordListValue, BinaryValue } from '../engine/data.js';

/** Writes records to a downloadable .xlsx file (SheetJS). */
export const xlsxExportRun: RunFn = async ({ config, inputs }) => {
  const records = inputs.records as RecordListValue;
  const sheetName = (config.sheetName as string) || 'Daten';
  const filename = (config.filename as string) || 'export.xlsx';

  const worksheet = XLSX.utils.json_to_sheet(records);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

  return {
    document: { files: [{ filename, data: new Uint8Array(buffer) }] } satisfies BinaryValue,
  };
};

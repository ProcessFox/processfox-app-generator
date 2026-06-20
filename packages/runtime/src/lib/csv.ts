import type { TableValue, RecordListValue } from '../engine/data.js';

/**
 * Minimal dependency-free CSV parsing/serialization. Handles quoted fields,
 * escaped quotes ("") and CRLF. Good enough for the V1 CSV modules and fully
 * testable in Node.
 */

/** Parse raw CSV text into a 2D array of strings, respecting quotes. */
export function parseCsvRows(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Parse CSV text into a table (named columns + object rows). */
export function parseCsvToTable(text: string, delimiter = ',', hasHeaderRow = true): TableValue {
  const grid = parseCsvRows(text, delimiter);
  if (grid.length === 0) return { columns: [], rows: [] };

  const width = grid.reduce((max, r) => Math.max(max, r.length), 0);
  const columns = hasHeaderRow
    ? (grid[0] ?? []).map((c, i) => c || `col${i + 1}`)
    : Array.from({ length: width }, (_, i) => `col${i + 1}`);
  const dataRows = hasHeaderRow ? grid.slice(1) : grid;

  const rows = dataRows.map((r) =>
    Object.fromEntries(columns.map((col, i) => [col, r[i] ?? ''])),
  );
  return { columns, rows };
}

function escapeField(value: unknown, delimiter: string): string {
  const s = value == null ? '' : String(value);
  if (s.includes(delimiter) || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Serialize records to CSV text. Columns are the union of keys, in first-seen order. */
export function serializeCsv(rows: RecordListValue, delimiter = ','): string {
  const columns: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }
  const lines = [columns.map((c) => escapeField(c, delimiter)).join(delimiter)];
  for (const row of rows) {
    lines.push(columns.map((c) => escapeField(row[c], delimiter)).join(delimiter));
  }
  return lines.join('\n');
}

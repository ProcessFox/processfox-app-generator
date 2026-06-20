import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import type { ModuleInstance } from '@processfox/core';
import { csvUploadRun } from '../src/impl/csvUpload.run.js';
import { filterRun } from '../src/impl/filter.run.js';
import { csvExportRun } from '../src/impl/csvExport.run.js';
import { xlsxExportRun } from '../src/impl/xlsxExport.run.js';
import type { TableValue, BinaryValue, RecordListValue } from '../src/engine/data.js';

const node = (config: Record<string, unknown>): ModuleInstance => ({
  instanceId: 'n',
  moduleId: 'm',
  moduleVersion: '1.0.0',
  config,
});
const ctx = { inputs: {}, loadAsset: () => new ArrayBuffer(0) };

describe('csvUploadRun', () => {
  it('parses uploaded CSV text into a table', async () => {
    const res = await csvUploadRun({
      node: node({}),
      config: { hasHeaderRow: true, delimiter: ',' },
      inputs: {},
      ctx: { ...ctx, inputs: { n: 'Name,Preis\nStuhl,49' } },
    });
    const table = res.table as TableValue;
    expect(table.columns).toEqual(['Name', 'Preis']);
    expect(table.rows[0]).toEqual({ Name: 'Stuhl', Preis: '49' });
  });
});

describe('filterRun', () => {
  const records: RecordListValue = [
    { status: 'open', n: '5' },
    { status: 'closed', n: '1' },
    { status: 'open', n: '3' },
  ];

  it('filters by an equality condition', async () => {
    const res = await filterRun({
      node: node({}),
      config: { where: { field: 'status', op: 'eq', value: 'open' } },
      inputs: { in: records },
      ctx,
    });
    expect(res.out).toEqual([
      { status: 'open', n: '5' },
      { status: 'open', n: '3' },
    ]);
  });

  it('sorts numerically', async () => {
    const res = await filterRun({
      node: node({}),
      config: { sortBy: 'n', sortDir: 'asc' },
      inputs: { in: records },
      ctx,
    });
    expect((res.out as RecordListValue).map((r) => r.n)).toEqual(['1', '3', '5']);
  });
});

describe('csvExportRun', () => {
  it('produces a downloadable CSV file', async () => {
    const res = await csvExportRun({
      node: node({}),
      config: { delimiter: ',', filename: 'out.csv' },
      inputs: { records: [{ a: '1', b: '2' }] },
      ctx,
    });
    const doc = res.document as BinaryValue;
    expect(doc.files[0]!.filename).toBe('out.csv');
    expect(new TextDecoder().decode(doc.files[0]!.data)).toBe('a,b\n1,2');
  });
});

describe('xlsxExportRun', () => {
  it('produces an .xlsx that reads back to the same rows', async () => {
    const res = await xlsxExportRun({
      node: node({}),
      config: { sheetName: 'Daten', filename: 'out.xlsx' },
      inputs: { records: [{ Name: 'Stuhl', Preis: 49 }] },
      ctx,
    });
    const doc = res.document as BinaryValue;
    expect(doc.files[0]!.filename).toBe('out.xlsx');
    const wb = XLSX.read(doc.files[0]!.data, { type: 'array' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Daten']!);
    expect(rows).toEqual([{ Name: 'Stuhl', Preis: 49 }]);
  });
});

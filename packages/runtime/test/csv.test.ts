import { describe, it, expect } from 'vitest';
import { parseCsvRows, parseCsvToTable, serializeCsv } from '../src/lib/csv.js';

describe('csv parsing', () => {
  it('parses simple rows', () => {
    expect(parseCsvRows('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('respects quoted fields with delimiters, newlines and escaped quotes', () => {
    const text = 'name,note\n"Doe, John","line1\nline2"\n"he said ""hi""",x';
    const rows = parseCsvRows(text);
    expect(rows[1]).toEqual(['Doe, John', 'line1\nline2']);
    expect(rows[2]).toEqual(['he said "hi"', 'x']);
  });

  it('builds a table with a header row', () => {
    const table = parseCsvToTable('Name,Preis\nStuhl,49\nTisch,199');
    expect(table.columns).toEqual(['Name', 'Preis']);
    expect(table.rows).toEqual([
      { Name: 'Stuhl', Preis: '49' },
      { Name: 'Tisch', Preis: '199' },
    ]);
  });

  it('generates column names without a header row', () => {
    const table = parseCsvToTable('1,2,3', ',', false);
    expect(table.columns).toEqual(['col1', 'col2', 'col3']);
  });

  it('supports a custom delimiter', () => {
    const table = parseCsvToTable('a;b\n1;2', ';');
    expect(table.rows[0]).toEqual({ a: '1', b: '2' });
  });
});

describe('csv serialization', () => {
  it('serializes records and quotes fields that need it', () => {
    const csv = serializeCsv([{ name: 'Doe, John', note: 'x' }]);
    expect(csv).toBe('name,note\n"Doe, John",x');
  });

  it('round-trips through parse', () => {
    const rows = [
      { a: '1', b: 'has "quote"' },
      { a: '2', b: 'plain' },
    ];
    const table = parseCsvToTable(serializeCsv(rows));
    expect(table.rows).toEqual(rows);
  });
});

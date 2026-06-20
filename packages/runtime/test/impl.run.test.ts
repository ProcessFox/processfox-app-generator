import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import PizZip from 'pizzip';
import type { ModuleInstance } from '@processfox/core';
import { xlsxUploadRun } from '../src/impl/xlsxUpload.run.js';
import { fieldMappingRun } from '../src/impl/fieldMapping.run.js';
import { docxTemplateRun } from '../src/impl/docxTemplate.run.js';
import type { TableValue, BinaryValue } from '../src/engine/data.js';

const node = (config: Record<string, unknown>): ModuleInstance => ({
  instanceId: 'n',
  moduleId: 'm',
  moduleVersion: '1.0.0',
  config,
});

/** Builds a real .xlsx in memory via SheetJS. */
function buildXlsx(): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet([
    { Artikelname: 'Stuhl', Preis: 49, SKU: 'A1' },
    { Artikelname: 'Tisch', Preis: 199, SKU: 'B2' },
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Produkte');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

/** Builds a minimal valid .docx template with a {name} / {price} placeholder. */
function buildDocxTemplate(): ArrayBuffer {
  const zip = new PizZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body><w:p><w:r><w:t>Produkt: {name} kostet {price}</w:t></w:r></w:p></w:body>
</w:document>`,
  );
  return zip.generate({ type: 'arraybuffer' }) as ArrayBuffer;
}

describe('xlsxUploadRun', () => {
  it('parses an uploaded .xlsx into a table', async () => {
    const result = await xlsxUploadRun({
      node: node({ sheet: 0, hasHeaderRow: true }),
      config: { sheet: 0, hasHeaderRow: true },
      inputs: {},
      ctx: { inputs: { n: buildXlsx() }, loadAsset: () => new ArrayBuffer(0) },
    });
    const table = result.table as TableValue;
    expect(table.columns).toContain('Artikelname');
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0]).toMatchObject({ Artikelname: 'Stuhl', SKU: 'A1' });
  });
});

describe('fieldMappingRun', () => {
  it('renames mapped columns and drops the rest', async () => {
    const table: TableValue = {
      columns: ['Artikelname', 'Preis', 'Extra'],
      rows: [{ Artikelname: 'Stuhl', Preis: 49, Extra: 'x' }],
    };
    const result = await fieldMappingRun({
      node: node({}),
      config: { mappings: { Artikelname: 'name', Preis: 'price' }, dropUnmapped: true },
      inputs: { in: table },
      ctx: { inputs: {}, loadAsset: () => new ArrayBuffer(0) },
    });
    expect(result.out).toEqual([{ name: 'Stuhl', price: 49 }]);
  });
});

describe('docxTemplateRun', () => {
  it('renders one document per record with patterned filenames', async () => {
    const template = buildDocxTemplate();
    const result = await docxTemplateRun({
      node: node({}),
      config: {
        templateAssetId: 't',
        mode: 'per-record',
        filenamePattern: 'Produkt-{name}.docx',
      },
      inputs: {
        records: [
          { name: 'Stuhl', price: 49 },
          { name: 'Tisch', price: 199 },
        ],
      },
      ctx: { inputs: {}, loadAsset: () => template },
    });

    const doc = result.document as BinaryValue;
    expect(doc.files).toHaveLength(2);
    expect(doc.files.map((f) => f.filename)).toEqual(['Produkt-Stuhl.docx', 'Produkt-Tisch.docx']);

    // The rendered document actually contains the merged value.
    const rendered = new PizZip(doc.files[0]!.data).file('word/document.xml')!.asText();
    expect(rendered).toContain('Produkt: Stuhl kostet 49');
  });
});

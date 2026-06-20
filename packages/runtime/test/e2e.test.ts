import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import PizZip from 'pizzip';
import { ModuleRegistry, builtinModules } from '@processfox/core';
import { executeManifest, type BinaryValue } from '../src/engine/index.js';
import { runners } from '../src/impl/runners.js';
import { referenceManifest } from '../src/manifest/reference.js';

function buildXlsx(): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet([
    { Artikelname: 'Stuhl', Preis: 49, SKU: 'A1' },
    { Artikelname: 'Tisch', Preis: 199, SKU: 'B2' },
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Produkte');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

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
<w:body><w:p><w:r><w:t>Produkt {sku}: {name} kostet {price}</w:t></w:r></w:p></w:body>
</w:document>`,
  );
  return zip.generate({ type: 'arraybuffer' }) as ArrayBuffer;
}

describe('end-to-end: XLSX → mapping → DOCX', () => {
  it('produces one rendered Word document per spreadsheet row', async () => {
    const registry = new ModuleRegistry(builtinModules);
    const template = buildDocxTemplate();

    const results = await executeManifest(referenceManifest(), registry, runners, {
      inputs: { n_upload: buildXlsx() },
      loadAsset: (id) => {
        if (id !== 'template') throw new Error(`unexpected asset ${id}`);
        return template;
      },
    });

    const doc = results.n_docx!.document as BinaryValue;
    expect(doc.files).toHaveLength(2);
    expect(doc.files.map((f) => f.filename)).toEqual(['Produkt-A1.docx', 'Produkt-B2.docx']);

    const rendered = new PizZip(doc.files[0]!.data).file('word/document.xml')!.asText();
    expect(rendered).toContain('Produkt A1: Stuhl kostet 49');
  });
});

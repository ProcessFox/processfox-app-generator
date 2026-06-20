import { MANIFEST_SCHEMA_VERSION, type AppManifest } from '@processfox/core';

/**
 * The V1 reference app: XLSX-Upload → Spalten-Mapping → DOCX-Vorlage.
 * Used by the player demo and by tests.
 */
export function referenceManifest(): AppManifest {
  return {
    id: 'app_demo',
    name: 'Produktliste → Word-Dokumente',
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    nodes: [
      {
        instanceId: 'n_upload',
        moduleId: 'xlsx-upload',
        moduleVersion: '1.0.0',
        config: { sheet: 0, hasHeaderRow: true },
      },
      {
        instanceId: 'n_map',
        moduleId: 'field-mapping',
        moduleVersion: '1.0.0',
        config: {
          mappings: { Artikelname: 'name', Preis: 'price', SKU: 'sku' },
          dropUnmapped: true,
        },
      },
      {
        instanceId: 'n_docx',
        moduleId: 'docx-template',
        moduleVersion: '1.0.0',
        config: {
          templateAssetId: 'template',
          mode: 'per-record',
          filenamePattern: 'Produkt-{sku}.docx',
        },
      },
    ],
    edges: [
      {
        id: 'e1',
        from: { instanceId: 'n_upload', portId: 'table' },
        to: { instanceId: 'n_map', portId: 'in' },
      },
      {
        id: 'e2',
        from: { instanceId: 'n_map', portId: 'out' },
        to: { instanceId: 'n_docx', portId: 'records' },
      },
    ],
  };
}

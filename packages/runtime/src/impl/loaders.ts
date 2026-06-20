import type { RunFn } from '../engine/types.js';
import type { ModuleImplementation } from './types.js';

/**
 * Lazy module-implementation registry. Each loader dynamically imports a module's
 * run + ui, so Vite splits them into separate chunks. An app only downloads the
 * code for the modules it actually uses — keeping the generator bundle small and
 * letting the module set grow without bloating the initial load.
 */
export const moduleLoaders: Record<string, () => Promise<ModuleImplementation>> = {
  'xlsx-upload': async () => {
    const [r, u] = await Promise.all([import('./xlsxUpload.run.js'), import('./xlsxUpload.ui.js')]);
    return { moduleId: 'xlsx-upload', run: r.xlsxUploadRun, ui: u.XlsxUploadUi };
  },
  'csv-upload': async () => {
    const [r, u] = await Promise.all([import('./csvUpload.run.js'), import('./csvUpload.ui.js')]);
    return { moduleId: 'csv-upload', run: r.csvUploadRun, ui: u.CsvUploadUi };
  },
  'field-mapping': async () => {
    const [r, u] = await Promise.all([
      import('./fieldMapping.run.js'),
      import('./fieldMapping.ui.js'),
    ]);
    return { moduleId: 'field-mapping', run: r.fieldMappingRun, ui: u.FieldMappingUi };
  },
  filter: async () => {
    const [r, u] = await Promise.all([import('./filter.run.js'), import('./filter.ui.js')]);
    return { moduleId: 'filter', run: r.filterRun, ui: u.FilterUi };
  },
  'docx-template': async () => {
    const [r, u] = await Promise.all([
      import('./docxTemplate.run.js'),
      import('./docxTemplate.ui.js'),
    ]);
    return { moduleId: 'docx-template', run: r.docxTemplateRun, ui: u.DocxTemplateUi };
  },
  'csv-export': async () => {
    const [r, u] = await Promise.all([import('./csvExport.run.js'), import('./csvExport.ui.js')]);
    return { moduleId: 'csv-export', run: r.csvExportRun, ui: u.CsvExportUi };
  },
  'xlsx-export': async () => {
    const [r, u] = await Promise.all([import('./xlsxExport.run.js'), import('./xlsxExport.ui.js')]);
    return { moduleId: 'xlsx-export', run: r.xlsxExportRun, ui: u.XlsxExportUi };
  },
};

/** Load implementations for the given module ids (deduplicated). */
export async function loadImplementations(
  moduleIds: string[],
): Promise<Map<string, ModuleImplementation>> {
  const unique = [...new Set(moduleIds)];
  const entries = await Promise.all(
    unique.map(async (id) => {
      const loader = moduleLoaders[id];
      if (!loader) throw new Error(`No implementation registered for module "${id}"`);
      return [id, await loader()] as const;
    }),
  );
  return new Map(entries);
}

/** Build the engine's runner map from loaded implementations. */
export function runnersFrom(impls: Map<string, ModuleImplementation>): Map<string, RunFn> {
  return new Map([...impls].map(([id, impl]) => [id, impl.run]));
}

import { readFile, writeFile } from 'node:fs/promises';
import type { AppManifest } from '@processfox/core';
import { injectManifest } from './bundle.js';

/**
 * Produce a standalone single-file app from the prebuilt player template and a
 * manifest. Used by the backend export endpoint and the CLI below.
 */
export async function exportAppHtml(templatePath: string, manifest: AppManifest): Promise<string> {
  const template = await readFile(templatePath, 'utf8');
  return injectManifest(template, manifest);
}

// CLI: tsx src/export/exportApp.ts <template.html> <manifest.json> <out.html>
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const [, , templatePath, manifestPath, outPath] = process.argv;
  if (!templatePath || !manifestPath || !outPath) {
    console.error('Usage: exportApp <template.html> <manifest.json> <out.html>');
    process.exit(1);
  }
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as AppManifest;
  await writeFile(outPath, await exportAppHtml(templatePath, manifest));
  console.log(`Exported ${outPath}`);
}

import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import type { RunFn } from '../engine/types.js';
import type { RecordListValue, BinaryValue, GeneratedFile } from '../engine/data.js';

/** Replaces {field} placeholders in a filename pattern; {index} is the row number. */
function formatFilename(
  pattern: string,
  record: Record<string, unknown>,
  index: number,
): string {
  return pattern.replace(/\{(\w+)\}/g, (_match, key: string) => {
    if (key === 'index') return String(index);
    const value = record[key];
    return value == null ? '' : String(value);
  });
}

/** Renders one .docx from the template buffer and the given data. */
function render(templateBuffer: ArrayBuffer, data: Record<string, unknown>): Uint8Array {
  const zip = new PizZip(templateBuffer);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(data);
  return doc.getZip().generate({ type: 'uint8array' }) as Uint8Array;
}

/**
 * Merges incoming records into a Word template and returns the generated files.
 * The actual download is a UI action (file-saver) — `run` only produces bytes,
 * so it stays testable in Node. Template/data never leave the machine.
 */
export const docxTemplateRun: RunFn = async ({ config, inputs, ctx }) => {
  const records = inputs.records as RecordListValue;
  const templateAssetId = config.templateAssetId as string;
  const mode = (config.mode ?? 'per-record') as 'per-record' | 'single';
  const filenamePattern = (config.filenamePattern ?? 'dokument-{index}.docx') as string;

  const templateBuffer = await ctx.loadAsset(templateAssetId);

  let files: GeneratedFile[];
  if (mode === 'single') {
    files = [
      {
        filename: formatFilename(filenamePattern, {}, 0),
        data: render(templateBuffer, { records }),
      },
    ];
  } else {
    files = records.map((record, index) => ({
      filename: formatFilename(filenamePattern, record, index),
      data: render(templateBuffer, record),
    }));
  }

  return { document: { files } satisfies BinaryValue };
};

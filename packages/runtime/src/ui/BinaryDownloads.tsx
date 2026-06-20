import { saveAs } from 'file-saver';
import type { BinaryValue } from '../engine/data.js';

/** Renders download buttons for the files an output module produced. */
export function BinaryDownloads({ result, mime }: { result?: Record<string, unknown>; mime: string }) {
  const document = result?.document as BinaryValue | undefined;
  if (!document || document.files.length === 0) {
    return <p className="text-sm text-slate-500">Datei(en) werden beim Ausführen erzeugt.</p>;
  }
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-slate-700">{document.files.length} Datei(en) erzeugt:</p>
      <ul className="space-y-1">
        {document.files.map((file, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => saveAs(new Blob([file.data as BlobPart], { type: mime }), file.filename)}
              className="text-sm text-[var(--pf-accent)] underline hover:text-[var(--pf-accent-hover)]"
            >
              ↓ {file.filename}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { useState } from 'react';
import { saveAs } from 'file-saver';
import type { NodeUiProps } from '../ui/types.js';
import type { BinaryValue } from '../engine/data.js';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function DocxTemplateUi({ node, provideAsset, assetsProvided, result }: NodeUiProps) {
  const templateAssetId = node.config.templateAssetId as string;
  const [templateName, setTemplateName] = useState<string | null>(null);

  async function handleTemplate(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTemplateName(file.name);
    provideAsset(templateAssetId, await file.arrayBuffer());
  }

  const document = result?.document as BinaryValue | undefined;

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm text-slate-600">Word-Vorlage (.docx) auswählen</span>
        <input
          type="file"
          accept=".docx"
          onChange={handleTemplate}
          className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-slate-700 hover:file:bg-slate-200"
        />
      </label>
      {assetsProvided[templateAssetId] && templateName && (
        <p className="text-sm text-emerald-700">✓ Vorlage {templateName} geladen</p>
      )}

      {document && document.files.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700">
            {document.files.length} Dokument(e) erzeugt:
          </p>
          <ul className="space-y-1">
            {document.files.map((file, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() =>
                    saveAs(new Blob([file.data as BlobPart], { type: DOCX_MIME }), file.filename)
                  }
                  className="text-sm text-[var(--pf-accent)] underline hover:text-[var(--pf-accent-hover)]"
                >
                  ↓ {file.filename}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

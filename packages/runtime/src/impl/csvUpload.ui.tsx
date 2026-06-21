import { useState } from 'react';
import type { NodeUiProps } from '../ui/types.js';

export function CsvUploadUi({ provideInput, inputProvided }: NodeUiProps) {
  const [filename, setFilename] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    provideInput(await file.text());
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="text-sm text-fg-secondary">CSV-Datei auswählen</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleChange}
          className="mt-1 block w-full text-sm text-fg-tertiary file:mr-3 file:rounded-comfortable file:border-0 file:bg-surface file:px-3 file:py-1.5 file:font-ui file:text-fg-secondary hover:file:bg-level3"
        />
      </label>
      {inputProvided && filename && (
        <p className="text-sm text-success">✓ {filename} geladen</p>
      )}
    </div>
  );
}

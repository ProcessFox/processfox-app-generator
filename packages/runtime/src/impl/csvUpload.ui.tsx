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
        <span className="text-sm text-slate-600">CSV-Datei auswählen</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleChange}
          className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-slate-700 hover:file:bg-slate-200"
        />
      </label>
      {inputProvided && filename && (
        <p className="text-sm text-emerald-700">✓ {filename} geladen</p>
      )}
    </div>
  );
}

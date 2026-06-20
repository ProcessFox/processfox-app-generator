import { useState } from 'react';
import { type AppManifest } from '@processfox/core';
import { AppWorkbench } from './AppWorkbench.js';

interface GenerateResponse {
  manifest: AppManifest | null;
  valid: boolean;
  finalText?: string;
}

/**
 * The generator-side UI: the creator types a prompt, the backend agent composes
 * a validated manifest, and the AppWorkbench renders it live with theme editing,
 * persistence and the same Player + data-flow panel the end user will get.
 */
export function GeneratorView() {
  const [prompt, setPrompt] = useState(
    'Aus einer Excel-Produktliste pro Zeile ein sauber formatiertes Word-Dokument erzeugen.',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manifest, setManifest] = useState<AppManifest | null>(null);
  const [finalText, setFinalText] = useState('');
  const [generation, setGeneration] = useState(0);

  async function generate() {
    setLoading(true);
    setError(null);
    setManifest(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = (await res.json().catch(() => ({}))) as GenerateResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? `Serverfehler (HTTP ${res.status})`);
      if (!data.valid || !data.manifest) {
        throw new Error('Der Agent konnte keine gültige App erzeugen.');
      }
      setManifest(data.manifest);
      setFinalText(data.finalText ?? '');
      setGeneration((g) => g + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <label className="block text-sm font-medium text-slate-700">
          Beschreibe die gewünschte App
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-orange-500 focus:outline-none"
        />
        <div className="mt-3">
          <button
            type="button"
            onClick={generate}
            disabled={loading || prompt.trim().length === 0}
            className="rounded-lg bg-orange-600 px-5 py-2.5 font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'Agent arbeitet…' : 'App generieren'}
          </button>
        </div>
        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>

      {manifest && (
        <>
          {finalText && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {finalText}
            </p>
          )}
          {/* key resets theme/save state when a new app is generated */}
          <AppWorkbench key={generation} manifest={manifest} />
        </>
      )}
    </div>
  );
}

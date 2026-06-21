import { useMemo, useState } from 'react';
import { saveAs } from 'file-saver';
import {
  ModuleRegistry,
  builtinModules,
  injectManifest,
  type AppManifest,
  type ThemeTokens,
} from '@processfox/core';
import { Player } from './Player.js';
import { DataFlowPanel } from './DataFlowPanel.js';
import { ThemeEditor } from './ThemeEditor.js';

/**
 * Editing surface around a manifest: theme editor + persistence + live preview.
 * Used both for the generated app and the demo app. The base manifest is fixed;
 * only the theme is mutated here, demonstrating "design adjustable, mechanics
 * locked". Saving stores a new immutable version via the backend.
 */
export function AppWorkbench({ manifest }: { manifest: AppManifest }) {
  const registry = useMemo(() => new ModuleRegistry(builtinModules), []);
  const [theme, setTheme] = useState<Partial<ThemeTokens>>(manifest.theme ?? {});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const themed = useMemo<AppManifest>(() => ({ ...manifest, theme }), [manifest, theme]);

  /**
   * Client-side export: fetch the single-file player template served by the
   * frontend (/player.html), inject the current (themed) manifest, download it.
   * Fully in-browser — no backend involved.
   */
  async function downloadStandalone() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch('/player.html', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Player-Vorlage nicht erreichbar (HTTP ${res.status})`);
      const html = injectManifest(await res.text(), themed);
      const name = (manifest.name || 'app').replace(/[^\w.-]+/g, '_').slice(0, 60);
      saveAs(new Blob([html], { type: 'text/html;charset=utf-8' }), `${name}.html`);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  }

  async function save() {
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: manifest.name, manifest: themed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        version?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `Serverfehler (HTTP ${res.status})`);
      setSaveStatus(`Gespeichert als ${data.id} · Version ${data.version}`);
    } catch (e) {
      setSaveStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <ThemeEditor
        theme={theme}
        onChange={setTheme}
        onSave={save}
        saving={saving}
        saveStatus={saveStatus}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={downloadStandalone}
          disabled={exporting}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {exporting ? 'Export…' : '↓ Als eigenständige App herunterladen (HTML)'}
        </button>
        {exportError && <span className="text-sm text-red-700">{exportError}</span>}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Player manifest={themed} />
        <DataFlowPanel manifest={themed} registry={registry} />
      </div>
    </div>
  );
}

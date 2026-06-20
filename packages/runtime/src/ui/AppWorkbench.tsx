import { useMemo, useState } from 'react';
import {
  ModuleRegistry,
  builtinModules,
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
  const [saved, setSaved] = useState<{ id: string; version: number } | null>(null);

  const themed = useMemo<AppManifest>(() => ({ ...manifest, theme }), [manifest, theme]);

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
      if (data.id && data.version) setSaved({ id: data.id, version: data.version });
      setSaveStatus(`Gespeichert als ${data.id} · Version ${data.version}`);
    } catch (e) {
      setSaved(null);
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
      {saved && (
        <a
          href={`/api/apps/${saved.id}/versions/${saved.version}/export`}
          className="inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          ↓ Als eigenständige App herunterladen (HTML)
        </a>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Player manifest={themed} />
        <DataFlowPanel manifest={themed} registry={registry} />
      </div>
    </div>
  );
}

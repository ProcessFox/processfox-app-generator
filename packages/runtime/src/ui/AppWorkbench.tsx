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
import { useAppActions } from './useAppActions.js';

/**
 * Editing surface around a manifest: theme editor + persistence + live preview.
 * Used both for the generated app and the demo app. The base manifest is fixed;
 * only the theme is mutated here, demonstrating "design adjustable, mechanics
 * locked". Saving stores a new immutable version via the backend.
 */
export function AppWorkbench({ manifest }: { manifest: AppManifest }) {
  const registry = useMemo(() => new ModuleRegistry(builtinModules), []);
  const [theme, setTheme] = useState<Partial<ThemeTokens>>(manifest.theme ?? {});

  const themed = useMemo<AppManifest>(() => ({ ...manifest, theme }), [manifest, theme]);
  const { saving, saveStatus, save, exporting, exportError, downloadStandalone } = useAppActions(
    manifest,
    themed,
  );

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

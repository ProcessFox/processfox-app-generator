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
import { Button } from './primitives.js';
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
        <Button onClick={downloadStandalone} disabled={exporting}>
          {exporting ? 'Export…' : '↓ Als eigenständige App herunterladen (HTML)'}
        </Button>
        {exportError && <span className="text-sm text-error">{exportError}</span>}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Player manifest={themed} />
        <DataFlowPanel manifest={themed} registry={registry} />
      </div>
    </div>
  );
}

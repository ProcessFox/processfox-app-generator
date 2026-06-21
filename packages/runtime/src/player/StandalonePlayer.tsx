import { useMemo } from 'react';
import { ModuleRegistry, builtinModules, type AppManifest } from '@processfox/core';
import { Player } from '../ui/Player.js';
import { DataFlowPanel } from '../ui/DataFlowPanel.js';
import { ThemeToggle } from '../ui/primitives.js';
import { useThemeMode } from '../ui/useThemeMode.js';

/**
 * The exported, server-less app the end user runs. No generator chrome, no
 * editor — the manifest (incl. its theme) is fixed at export time. Just the
 * Player plus the data-flow/privacy panel. Everything runs in the browser.
 */
export function StandalonePlayer({ manifest }: { manifest: AppManifest }) {
  const registry = useMemo(() => new ModuleRegistry(builtinModules), []);
  const { mode, toggle } = useThemeMode();

  return (
    <div className="min-h-screen bg-canvas text-fg">
      <header className="border-b border-line-standard bg-panel">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-ui text-fg">{manifest.name}</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-fg-quaternary">
              <span className="font-strong">
                <span className="text-accent">Process</span>Fox
              </span>{' '}
              · läuft lokal im Browser
            </span>
            <ThemeToggle mode={mode} onToggle={toggle} />
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
        <Player manifest={manifest} />
        <DataFlowPanel manifest={manifest} registry={registry} />
      </main>
    </div>
  );
}

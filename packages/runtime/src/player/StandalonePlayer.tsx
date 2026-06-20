import { useMemo } from 'react';
import { ModuleRegistry, builtinModules, type AppManifest } from '@processfox/core';
import { Player } from '../ui/Player.js';
import { DataFlowPanel } from '../ui/DataFlowPanel.js';

/**
 * The exported, server-less app the end user runs. No generator chrome, no
 * editor — the manifest (incl. its theme) is fixed at export time. Just the
 * Player plus the data-flow/privacy panel. Everything runs in the browser.
 */
export function StandalonePlayer({ manifest }: { manifest: AppManifest }) {
  const registry = useMemo(() => new ModuleRegistry(builtinModules), []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold text-slate-800">{manifest.name}</h1>
          <span className="text-xs text-slate-400">
            <span className="font-bold">
              <span className="text-orange-600">Process</span>Fox
            </span>{' '}
            · läuft lokal im Browser
          </span>
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[1fr_320px]">
        <Player manifest={manifest} />
        <DataFlowPanel manifest={manifest} registry={registry} />
      </main>
    </div>
  );
}

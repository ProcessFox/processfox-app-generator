import type { AppManifest, ModuleRegistry } from '@processfox/core';
import { topologicalOrder } from '../engine/execute.js';

const CATEGORY_LABEL: Record<string, string> = {
  input: 'Eingabe',
  transform: 'Verarbeitung',
  output: 'Ausgabe',
  credentials: 'Zugangsdaten',
};

/**
 * Shows the app as a transparent, ordered chain of modules with their port
 * types and a per-module "runs locally in the browser" badge — the core
 * data-transparency promise. In V1 this is technically guaranteed: no module
 * touches the network.
 */
export function DataFlowPanel({
  manifest,
  registry,
}: {
  manifest: AppManifest;
  registry: ModuleRegistry;
}) {
  const order = topologicalOrder(manifest);

  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-800">Datenfluss & Datenschutz</h2>
      <p className="mt-1 text-xs text-slate-500">
        So und nur so werden deine Daten verarbeitet.
      </p>

      <ol className="mt-4 space-y-3">
        {order.map((instanceId, index) => {
          const node = manifest.nodes.find((n) => n.instanceId === instanceId)!;
          const def = registry.getOrThrow(node.moduleId);
          return (
            <li key={instanceId} className="relative">
              {index > 0 && <div className="mx-auto h-3 w-px bg-slate-300" />}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">{def.title}</span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">
                    {CATEGORY_LABEL[def.category] ?? def.category}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {def.inputs.length > 0 && (
                    <span>← {def.inputs.map((p) => p.type).join(', ')} </span>
                  )}
                  {def.outputs.length > 0 && (
                    <span>→ {def.outputs.map((p) => p.type).join(', ')}</span>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] text-emerald-700">🔒 läuft lokal im Browser</p>
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

import { useMemo, useState, type CSSProperties } from 'react';
import {
  ModuleRegistry,
  builtinModules,
  resolveTheme,
  themeToCssVars,
  type AppManifest,
} from '@processfox/core';
import {
  executeManifest,
  topologicalOrder,
  ManifestInvalidError,
  type ExecutionResults,
} from '../engine/index.js';
import { implementations, runnersFrom } from '../impl/index.js';

/**
 * The end-user "player": renders each module's UI in execution order, collects
 * user inputs + assets, runs the manifest in-browser on demand, and surfaces
 * results (downloads) on the output modules.
 */
export function Player({ manifest }: { manifest: AppManifest }) {
  const registry = useMemo(() => new ModuleRegistry(builtinModules), []);
  const runners = useMemo(() => runnersFrom(implementations), []);
  const order = useMemo(() => topologicalOrder(manifest), [manifest]);

  const [inputs, setInputs] = useState<Record<string, unknown>>({});
  const [assets, setAssets] = useState<Record<string, ArrayBuffer>>({});
  const [results, setResults] = useState<ExecutionResults>({});
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const res = await executeManifest(manifest, registry, runners, {
        inputs,
        loadAsset: (id) => {
          const buf = assets[id];
          if (!buf) throw new Error(`Asset "${id}" fehlt – bitte zuerst hochladen.`);
          return buf;
        },
      });
      setResults(res);
    } catch (e) {
      const message =
        e instanceof ManifestInvalidError
          ? e.errors.map((x) => x.message).join('\n')
          : e instanceof Error
            ? e.message
            : String(e);
      setError(message);
    } finally {
      setRunning(false);
    }
  }

  const appVars = themeToCssVars(resolveTheme(manifest.theme)) as CSSProperties;

  return (
    <div className="space-y-4" style={appVars}>
      {order.map((instanceId, index) => {
        const node = manifest.nodes.find((n) => n.instanceId === instanceId)!;
        const def = registry.getOrThrow(node.moduleId);
        const impl = implementations.get(node.moduleId);
        if (!impl) return null;
        const Ui = impl.ui;
        const cardVars = themeToCssVars(
          resolveTheme(manifest.theme, node.design),
        ) as CSSProperties;
        return (
          <section
            key={instanceId}
            style={cardVars}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--pf-accent)] text-xs font-bold text-[var(--pf-accent-fg)]">
                {index + 1}
              </span>
              <h3 className="font-semibold text-slate-800">{def.title}</h3>
            </div>
            <Ui
              node={node}
              definition={def}
              inputProvided={inputs[instanceId] !== undefined}
              provideInput={(value) => setInputs((s) => ({ ...s, [instanceId]: value }))}
              assetsProvided={Object.fromEntries(Object.keys(assets).map((k) => [k, true]))}
              provideAsset={(assetId, buffer) =>
                setAssets((s) => ({ ...s, [assetId]: buffer }))
              }
              result={results[instanceId]}
            />
          </section>
        );
      })}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="rounded-[var(--pf-radius)] bg-[var(--pf-accent)] px-5 py-2.5 font-medium text-[var(--pf-accent-fg)] hover:bg-[var(--pf-accent-hover)] disabled:opacity-50"
        >
          {running ? 'Wird ausgeführt…' : 'App ausführen'}
        </button>
      </div>

      {error && (
        <pre className="whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </pre>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
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
import { loadImplementations, runnersFrom, type ModuleImplementation } from '../impl/index.js';

/**
 * The end-user "player": renders each module's UI in execution order, collects
 * user inputs + assets, runs the manifest in-browser on demand, and surfaces
 * results (downloads). Module implementations are loaded lazily — only the
 * modules this app uses are fetched.
 */
export function Player({ manifest }: { manifest: AppManifest }) {
  const registry = useMemo(() => new ModuleRegistry(builtinModules), []);
  const order = useMemo(() => topologicalOrder(manifest), [manifest]);

  const [impls, setImpls] = useState<Map<string, ModuleImplementation> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, unknown>>({});
  const [assets, setAssets] = useState<Record<string, ArrayBuffer>>({});
  const [results, setResults] = useState<ExecutionResults>({});
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lazily load the implementations for the modules in this manifest.
  useEffect(() => {
    let cancelled = false;
    setImpls(null);
    setLoadError(null);
    loadImplementations(manifest.nodes.map((n) => n.moduleId))
      .then((m) => {
        if (!cancelled) setImpls(m);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [manifest]);

  async function run() {
    if (!impls) return;
    setRunning(true);
    setError(null);
    try {
      const res = await executeManifest(manifest, registry, runnersFrom(impls), {
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

  if (loadError) {
    return (
      <pre className="whitespace-pre-wrap rounded-card border border-error/30 bg-error/10 p-3 text-sm text-error">
        Module konnten nicht geladen werden: {loadError}
      </pre>
    );
  }
  if (!impls) {
    return <p className="text-sm text-fg-tertiary">Module werden geladen…</p>;
  }

  return (
    <div className="space-y-4" style={appVars}>
      {order.map((instanceId, index) => {
        const node = manifest.nodes.find((n) => n.instanceId === instanceId)!;
        const def = registry.getOrThrow(node.moduleId);
        const impl = impls.get(node.moduleId);
        if (!impl) return null;
        const Ui = impl.ui;
        const cardVars = themeToCssVars(resolveTheme(manifest.theme, node.design)) as CSSProperties;
        return (
          <section
            key={instanceId}
            style={cardVars}
            className="rounded-panel border border-line-subtle bg-panel p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--pf-accent)] text-xs font-ui text-[var(--pf-accent-fg)]">
                {index + 1}
              </span>
              <h3 className="font-ui text-fg">{def.title}</h3>
            </div>
            <Ui
              node={node}
              definition={def}
              inputProvided={inputs[instanceId] !== undefined}
              provideInput={(value) => setInputs((s) => ({ ...s, [instanceId]: value }))}
              assetsProvided={Object.fromEntries(Object.keys(assets).map((k) => [k, true]))}
              provideAsset={(assetId, buffer) => setAssets((s) => ({ ...s, [assetId]: buffer }))}
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
          className="rounded-[var(--pf-radius)] bg-[var(--pf-accent)] px-5 py-2.5 font-ui text-[var(--pf-accent-fg)] transition duration-150 ease-default hover:bg-[var(--pf-accent-hover)] active:scale-[0.98] focus-visible:focus-ring disabled:opacity-40"
        >
          {running ? 'Wird ausgeführt…' : 'App ausführen'}
        </button>
      </div>

      {error && (
        <pre className="whitespace-pre-wrap rounded-card border border-error/30 bg-error/10 p-3 text-sm text-error">
          {error}
        </pre>
      )}
    </div>
  );
}

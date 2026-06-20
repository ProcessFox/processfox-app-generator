import type { NodeUiProps } from '../ui/types.js';

export function FieldMappingUi({ node }: NodeUiProps) {
  const mappings = (node.config.mappings ?? {}) as Record<string, string>;
  const entries = Object.entries(mappings);

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">
        Spalten werden automatisch umbenannt (Kernmechanik gesperrt):
      </p>
      <ul className="space-y-1 text-sm">
        {entries.map(([source, target]) => (
          <li key={source} className="flex items-center gap-2 font-mono text-xs">
            <span className="rounded bg-slate-100 px-1.5 py-0.5">{source}</span>
            <span className="text-slate-400">→</span>
            <span className="rounded bg-[var(--pf-accent)] px-1.5 py-0.5 text-[var(--pf-accent-fg)]">
              {target}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

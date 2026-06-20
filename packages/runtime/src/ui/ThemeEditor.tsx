import { DEFAULT_THEME, type ThemeTokens } from '@processfox/core';

const PRESETS: Array<{ name: string; theme: Partial<ThemeTokens> }> = [
  { name: 'Orange', theme: { accent: '#ea580c', accentHover: '#c2410c', accentForeground: '#ffffff' } },
  { name: 'Blau', theme: { accent: '#2563eb', accentHover: '#1d4ed8', accentForeground: '#ffffff' } },
  { name: 'Grün', theme: { accent: '#16a34a', accentHover: '#15803d', accentForeground: '#ffffff' } },
  { name: 'Violett', theme: { accent: '#7c3aed', accentHover: '#6d28d9', accentForeground: '#ffffff' } },
  { name: 'Schiefer', theme: { accent: '#334155', accentHover: '#1e293b', accentForeground: '#ffffff' } },
];

const RADII: Array<{ label: string; value: string }> = [
  { label: 'Eckig', value: '0.125rem' },
  { label: 'Standard', value: '0.5rem' },
  { label: 'Rund', value: '1rem' },
];

interface Props {
  theme: Partial<ThemeTokens>;
  onChange: (theme: Partial<ThemeTokens>) => void;
  onSave: () => void;
  saving: boolean;
  saveStatus: string | null;
}

/**
 * Editor for the *adjustable* design surface. The creator changes accent / radius;
 * the core mechanics (modules, ports, run) are untouched — only theme tokens move.
 */
export function ThemeEditor({ theme, onChange, onSave, saving, saveStatus }: Props) {
  const accent = theme.accent ?? DEFAULT_THEME.accent;
  const radius = theme.radius ?? DEFAULT_THEME.radius;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">Design anpassen</h2>
        <span className="text-xs text-slate-400">Kernmechanik bleibt gesperrt</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-600">Akzent:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => onChange({ ...theme, ...preset.theme })}
            title={preset.name}
            aria-label={preset.name}
            className={`h-7 w-7 rounded-full border-2 ${accent === preset.theme.accent ? 'border-slate-900' : 'border-white shadow'}`}
            style={{ backgroundColor: preset.theme.accent }}
          />
        ))}
        <label className="ml-1 flex items-center gap-1 text-sm text-slate-600">
          eigene:
          <input
            type="color"
            value={accent}
            onChange={(e) =>
              onChange({ ...theme, accent: e.target.value, accentHover: e.target.value })
            }
            className="h-7 w-9 cursor-pointer rounded border border-slate-200"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-slate-600">Ecken:</span>
        {RADII.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => onChange({ ...theme, radius: r.value })}
            className={`rounded-md border px-2.5 py-1 text-xs ${radius === r.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-600'}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {saving ? 'Speichern…' : 'App-Version speichern'}
        </button>
        {saveStatus && <span className="text-sm text-emerald-700">{saveStatus}</span>}
      </div>
    </section>
  );
}

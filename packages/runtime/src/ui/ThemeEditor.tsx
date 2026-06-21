import { DEFAULT_THEME, type ThemeTokens } from '@processfox/core';
import { Button } from './primitives.js';

const PRESETS: Array<{ name: string; theme: Partial<ThemeTokens> }> = [
  { name: 'Indigo', theme: { accent: '#5e6ad2', accentHover: '#4b57c8', accentForeground: '#ffffff' } },
  { name: 'Orange', theme: { accent: '#ea580c', accentHover: '#c2410c', accentForeground: '#ffffff' } },
  { name: 'Blau', theme: { accent: '#2563eb', accentHover: '#1d4ed8', accentForeground: '#ffffff' } },
  { name: 'Grün', theme: { accent: '#16a34a', accentHover: '#15803d', accentForeground: '#ffffff' } },
  { name: 'Violett', theme: { accent: '#7c3aed', accentHover: '#6d28d9', accentForeground: '#ffffff' } },
  { name: 'Schiefer', theme: { accent: '#334155', accentHover: '#1e293b', accentForeground: '#ffffff' } },
];

const RADII: Array<{ label: string; value: string }> = [
  { label: 'Eckig', value: '2px' },
  { label: 'Standard', value: '6px' }, // matches DEFAULT_THEME.radius (Linear comfortable)
  { label: 'Rund', value: '12px' },
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
    <section className="rounded-panel border border-line-subtle bg-panel p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-ui text-fg">Design anpassen</h2>
        <span className="text-xs text-fg-quaternary">Kernmechanik bleibt gesperrt</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-fg-secondary">Akzent:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => onChange({ ...theme, ...preset.theme })}
            title={preset.name}
            aria-label={preset.name}
            className={`h-7 w-7 rounded-full border-2 transition duration-150 ease-default focus-visible:focus-ring ${accent === preset.theme.accent ? 'border-fg' : 'border-line-subtle'}`}
            style={{ backgroundColor: preset.theme.accent }}
          />
        ))}
        <label className="ml-1 flex items-center gap-1 text-sm text-fg-secondary">
          eigene:
          <input
            type="color"
            value={accent}
            onChange={(e) =>
              onChange({ ...theme, accent: e.target.value, accentHover: e.target.value })
            }
            className="h-7 w-9 cursor-pointer rounded-standard border border-line-subtle bg-surface"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm text-fg-secondary">Ecken:</span>
        {RADII.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => onChange({ ...theme, radius: r.value })}
            className={`rounded-comfortable border px-2.5 py-1 text-xs font-ui transition duration-150 ease-default focus-visible:focus-ring ${radius === r.value ? 'border-accent bg-accent text-white' : 'border-line-subtle text-fg-secondary hover:bg-surface'}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button variant="subtle" onClick={onSave} disabled={saving}>
          {saving ? 'Speichern…' : 'App-Version speichern'}
        </Button>
        {saveStatus && <span className="text-sm text-success">{saveStatus}</span>}
      </div>
    </section>
  );
}

import { describe, it, expect } from 'vitest';
import { DEFAULT_THEME, resolveTheme, themeToCssVars } from '../src/index.js';

describe('theme', () => {
  it('returns defaults when no overrides are given', () => {
    expect(resolveTheme()).toEqual(DEFAULT_THEME);
  });

  it('layers app theme then per-node design, ignoring undefined', () => {
    const resolved = resolveTheme(
      { accent: '#2563eb', accentHover: '#1d4ed8' }, // app theme
      { accent: '#16a34a', radius: undefined }, // node override
    );
    expect(resolved.accent).toBe('#16a34a'); // node wins
    expect(resolved.accentHover).toBe('#1d4ed8'); // from app theme
    expect(resolved.radius).toBe(DEFAULT_THEME.radius); // undefined ignored
  });

  it('maps tokens to CSS custom properties', () => {
    const vars = themeToCssVars(resolveTheme({ accent: '#000000' }));
    expect(vars['--pf-accent']).toBe('#000000');
    expect(vars['--pf-radius']).toBe(DEFAULT_THEME.radius);
  });
});

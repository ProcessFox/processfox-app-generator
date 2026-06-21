/**
 * Theme tokens — the *adjustable* surface of a module/app. The creator may
 * change these (colors, radius); the core mechanics (ports, run, config) stay
 * locked. Tokens live in core so the agent, the editor and the runtime share
 * one shape. The runtime maps them to CSS custom properties.
 */

export interface ThemeTokens {
  /** Primary accent color (buttons, highlights). */
  accent: string;
  /** Accent on hover. */
  accentHover: string;
  /** Text/icon color on top of the accent. */
  accentForeground: string;
  /** Border radius for controls (any CSS length). */
  radius: string;
}

export const DEFAULT_THEME: ThemeTokens = {
  // Linear Indigo — the single interactive accent (see LINEAR design system).
  accent: '#5e6ad2',
  accentHover: '#4b57c8',
  accentForeground: '#ffffff',
  radius: '6px',
};

/**
 * Merge defaults with later overrides (app theme, then per-node design).
 * `undefined` fields are ignored so partial overrides only touch what they set.
 */
export function resolveTheme(...overrides: Array<Partial<ThemeTokens> | undefined>): ThemeTokens {
  const result: ThemeTokens = { ...DEFAULT_THEME };
  for (const override of overrides) {
    if (!override) continue;
    for (const key of Object.keys(override) as (keyof ThemeTokens)[]) {
      const value = override[key];
      if (value !== undefined) result[key] = value;
    }
  }
  return result;
}

/** Map resolved tokens to CSS custom properties consumed by the runtime UIs. */
export function themeToCssVars(theme: ThemeTokens): Record<string, string> {
  return {
    '--pf-accent': theme.accent,
    '--pf-accent-hover': theme.accentHover,
    '--pf-accent-fg': theme.accentForeground,
    '--pf-radius': theme.radius,
  };
}

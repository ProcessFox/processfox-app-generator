import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'pf-theme-mode';

/**
 * Light/dark mode for the generator chrome. Light is the default; the choice is
 * persisted and applied by toggling `data-theme="dark"` on <html>, which flips
 * every design token (see index.css). No system-preference auto-follow — the
 * user opts in explicitly, matching the "light is the default" decision.
 */
export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // localStorage may be unavailable (private mode / SSR) — fall back to light.
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Persistence is best-effort; the in-memory mode still applies.
    }
  }, [mode]);

  const toggle = useCallback(() => setMode((m) => (m === 'dark' ? 'light' : 'dark')), []);

  return { mode, toggle };
}

import { useState } from 'react';
import { AppWorkspace } from './ui/AppWorkspace.js';
import { GeneratorLanding, type GeneratedApp } from './ui/GeneratorLanding.js';
import { ThemeToggle } from './ui/primitives.js';
import { useThemeMode, type ThemeMode } from './ui/useThemeMode.js';

export default function App() {
  const { mode, toggle } = useThemeMode();
  // When set, the generator has produced an app and we show its dedicated
  // workspace sub-page instead of the landing prompt.
  const [generated, setGenerated] = useState<GeneratedApp | null>(null);

  // The workspace is a full-width sub-page with its own navbar (app title left);
  // the landing lives in the centered shell.
  if (generated) {
    return (
      <div className="min-h-screen bg-canvas text-fg">
        <AppWorkspace
          initialManifest={generated.manifest}
          conversationId={generated.conversationId}
          initialMessages={generated.messages}
          onBack={() => setGenerated(null)}
          themeMode={mode}
          onToggleTheme={toggle}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-fg">
      <Header onHome={() => setGenerated(null)} themeMode={mode} onToggleTheme={toggle} />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <GeneratorLanding onGenerated={setGenerated} />
      </main>
    </div>
  );
}

function Header({
  onHome,
  themeMode,
  onToggleTheme,
}: {
  onHome: () => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
}) {
  return (
    <header
      className="sticky top-0 z-[50] border-b border-line-standard"
      style={{ background: 'color-mix(in srgb, var(--color-bg-marketing) 85%, transparent)', backdropFilter: 'blur(12px) saturate(180%)' }}
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <button type="button" onClick={onHome} className="text-xl font-strong text-fg">
          <span className="text-accent">Process</span>Fox
        </button>
        <ThemeToggle mode={themeMode} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}

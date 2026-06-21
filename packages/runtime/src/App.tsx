import { useMemo, useState } from 'react';
import { referenceManifest } from './manifest/reference.js';
import { AppWorkbench } from './ui/AppWorkbench.js';
import { AppWorkspace } from './ui/AppWorkspace.js';
import { GeneratorLanding, type GeneratedApp } from './ui/GeneratorLanding.js';
import { ThemeToggle } from './ui/primitives.js';
import { useThemeMode, type ThemeMode } from './ui/useThemeMode.js';

type Tab = 'generator' | 'demo';

export default function App() {
  const demoManifest = useMemo(() => referenceManifest(), []);
  const [tab, setTab] = useState<Tab>('generator');
  const { mode, toggle } = useThemeMode();
  // When set, the generator has produced an app and we show its dedicated
  // workspace sub-page instead of the landing prompt.
  const [generated, setGenerated] = useState<GeneratedApp | null>(null);

  // The workspace is a full-width sub-page with its own navbar (app title left,
  // no Generator/Demo switch); landing/demo live in the centered shell.
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
      <Header
        tab={tab}
        onTab={setTab}
        onHome={() => setGenerated(null)}
        themeMode={mode}
        onToggleTheme={toggle}
      />
      <main className="mx-auto max-w-5xl px-6 py-8">
        {tab === 'generator' ? (
          <GeneratorLanding onGenerated={setGenerated} />
        ) : (
          <AppWorkbench manifest={demoManifest} />
        )}
      </main>
    </div>
  );
}

function Header({
  tab,
  onTab,
  onHome,
  themeMode,
  onToggleTheme,
}: {
  tab: Tab;
  onTab: (tab: Tab) => void;
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
        <div className="flex items-center gap-2">
          <nav className="flex gap-1 rounded-comfortable border border-line-subtle bg-surface p-1 text-sm">
            {(['generator', 'demo'] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onTab(id)}
                className={`rounded-standard px-3 py-1.5 font-ui transition duration-150 ease-default focus-visible:focus-ring ${
                  tab === id ? 'bg-panel text-fg shadow-popover' : 'text-fg-tertiary hover:text-fg-secondary'
                }`}
              >
                {id === 'generator' ? 'Generator' : 'Demo-App'}
              </button>
            ))}
          </nav>
          <ThemeToggle mode={themeMode} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
}

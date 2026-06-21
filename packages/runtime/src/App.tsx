import { useMemo, useState } from 'react';
import { referenceManifest } from './manifest/reference.js';
import { AppWorkbench } from './ui/AppWorkbench.js';
import { AppWorkspace } from './ui/AppWorkspace.js';
import { GeneratorLanding, type GeneratedApp } from './ui/GeneratorLanding.js';

type Tab = 'generator' | 'demo';

export default function App() {
  const demoManifest = useMemo(() => referenceManifest(), []);
  const [tab, setTab] = useState<Tab>('generator');
  // When set, the generator has produced an app and we show its dedicated
  // workspace sub-page instead of the landing prompt.
  const [generated, setGenerated] = useState<GeneratedApp | null>(null);

  // The workspace is a full-width sub-page; landing/demo live in the centered shell.
  if (generated) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <Header
          tab="generator"
          onTab={(t) => {
            setTab(t);
            setGenerated(null);
          }}
          onHome={() => setGenerated(null)}
        />
        <AppWorkspace
          initialManifest={generated.manifest}
          conversationId={generated.conversationId}
          initialMessages={generated.messages}
          onBack={() => setGenerated(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Header tab={tab} onTab={setTab} onHome={() => setGenerated(null)} />
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
}: {
  tab: Tab;
  onTab: (tab: Tab) => void;
  onHome: () => void;
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <button type="button" onClick={onHome} className="text-xl font-bold">
          <span className="text-orange-600">Process</span>Fox
        </button>
        <nav className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
          <button
            type="button"
            onClick={() => onTab('generator')}
            className={`rounded-md px-3 py-1.5 ${tab === 'generator' ? 'bg-white font-medium shadow-sm' : 'text-slate-600'}`}
          >
            Generator
          </button>
          <button
            type="button"
            onClick={() => onTab('demo')}
            className={`rounded-md px-3 py-1.5 ${tab === 'demo' ? 'bg-white font-medium shadow-sm' : 'text-slate-600'}`}
          >
            Demo-App
          </button>
        </nav>
      </div>
    </header>
  );
}

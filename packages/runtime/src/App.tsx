import { useMemo, useState } from 'react';
import { referenceManifest } from './manifest/reference.js';
import { AppWorkbench } from './ui/AppWorkbench.js';
import { GeneratorView } from './ui/GeneratorView.js';

type View = 'generator' | 'demo';

export default function App() {
  const demoManifest = useMemo(() => referenceManifest(), []);
  const [view, setView] = useState<View>('generator');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold">
            <span className="text-orange-600">Process</span>Fox
          </h1>
          <nav className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
            <button
              type="button"
              onClick={() => setView('generator')}
              className={`rounded-md px-3 py-1.5 ${view === 'generator' ? 'bg-white font-medium shadow-sm' : 'text-slate-600'}`}
            >
              Generator
            </button>
            <button
              type="button"
              onClick={() => setView('demo')}
              className={`rounded-md px-3 py-1.5 ${view === 'demo' ? 'bg-white font-medium shadow-sm' : 'text-slate-600'}`}
            >
              Demo-App
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {view === 'generator' ? <GeneratorView /> : <AppWorkbench manifest={demoManifest} />}
      </main>
    </div>
  );
}

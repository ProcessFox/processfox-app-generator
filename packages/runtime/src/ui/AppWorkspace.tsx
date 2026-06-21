import { useMemo, useState } from 'react';
import { ModuleRegistry, builtinModules, type AppManifest } from '@processfox/core';
import { Player } from './Player.js';
import { DataFlowPanel } from './DataFlowPanel.js';
import { ThemeEditor } from './ThemeEditor.js';
import { ChatPanel, type ChatMessage } from './ChatPanel.js';
import { useAppActions } from './useAppActions.js';
import { streamGenerate, type StreamEvent } from '../lib/agentStream.js';

/**
 * The dedicated sub-page for a generated app: a three-column workspace.
 *   left   — chat that refines the app (multi-turn editing of the manifest)
 *   middle — live Player preview (the same one the end user gets)
 *   right  — design adjustments (theme) + the data-flow / privacy overview
 *
 * The manifest is the single source of truth — theme lives inside it. Theme
 * edits (right panel) update `manifest.theme`; chat-driven edits replace the
 * manifest but keep the current theme unless the agent changed it. Mechanics
 * stay locked; only theme is user-editable here.
 */
export function AppWorkspace({
  initialManifest,
  conversationId,
  initialMessages,
  onBack,
}: {
  initialManifest: AppManifest;
  conversationId: string;
  initialMessages: ChatMessage[];
  onBack: () => void;
}) {
  const registry = useMemo(() => new ModuleRegistry(builtinModules), []);
  const [manifest, setManifest] = useState<AppManifest>(initialManifest);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [liveEvents, setLiveEvents] = useState<StreamEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const theme = manifest.theme ?? {};
  const { saving, saveStatus, save, exporting, exportError, downloadStandalone } = useAppActions(
    manifest,
    manifest,
  );

  async function send(prompt: string) {
    setBusy(true);
    setChatError(null);
    setLiveEvents([]);
    setMessages((m) => [...m, { role: 'user', text: prompt }]);
    const events: StreamEvent[] = [];
    try {
      const result = await streamGenerate({
        prompt,
        conversationId,
        onEvent: (e) => {
          events.push(e);
          setLiveEvents([...events]);
        },
      });
      if (result.valid && result.manifest) {
        const next = result.manifest;
        // Keep the user's current theme unless the agent explicitly changed it.
        setManifest((prev) => ({ ...next, theme: next.theme ?? prev.theme }));
      }
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text:
            result.finalText ||
            (result.valid ? 'App aktualisiert.' : 'Ich konnte die Änderung nicht umsetzen.'),
          events: events.filter((e) => e.type === 'tool' || e.type === 'validation'),
        },
      ]);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setLiveEvents([]);
    }
  }

  return (
    <div className="flex h-[calc(100vh-65px)] flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            ← Neue App
          </button>
          <h2 className="font-semibold text-slate-800">{manifest.name}</h2>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus && <span className="text-sm text-emerald-700">{saveStatus}</span>}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? 'Speichern…' : 'Version speichern'}
          </button>
          <button
            type="button"
            onClick={downloadStandalone}
            disabled={exporting}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {exporting ? 'Export…' : '↓ HTML-App'}
          </button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-[340px_1fr_340px]">
        <ChatPanel
          messages={messages}
          liveEvents={liveEvents}
          busy={busy}
          error={chatError}
          onSend={send}
        />

        <main className="overflow-y-auto rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Vorschau</h2>
          <Player manifest={manifest} />
        </main>

        <div className="space-y-4 overflow-y-auto">
          <ThemeEditor
            theme={theme}
            onChange={(t) => setManifest((m) => ({ ...m, theme: t }))}
            onSave={save}
            saving={saving}
            saveStatus={saveStatus}
          />
          {exportError && <p className="text-sm text-red-700">{exportError}</p>}
          <DataFlowPanel manifest={manifest} registry={registry} />
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { ModuleRegistry, builtinModules, type AppManifest } from '@processfox/core';
import { Player } from './Player.js';
import { DataFlowPanel } from './DataFlowPanel.js';
import { ThemeEditor } from './ThemeEditor.js';
import { ChatPanel, type ChatMessage } from './ChatPanel.js';
import { Button, ThemeToggle } from './primitives.js';
import type { ThemeMode } from './useThemeMode.js';
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
  themeMode,
  onToggleTheme,
}: {
  initialManifest: AppManifest;
  conversationId: string;
  initialMessages: ChatMessage[];
  onBack: () => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
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
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-between border-b border-line-standard bg-panel px-6 py-3">
        <h1 className="text-lg font-strong text-fg">{manifest.name}</h1>
        <div className="flex items-center gap-3">
          {saveStatus && <span className="text-sm text-success">{saveStatus}</span>}
          <ThemeToggle mode={themeMode} onToggle={onToggleTheme} />
          <Button variant="ghost" className="px-3 py-1.5" onClick={onBack}>
            ← Neue App
          </Button>
          <Button variant="subtle" className="px-3 py-1.5" onClick={save} disabled={saving}>
            {saving ? 'Speichern…' : 'Version speichern'}
          </Button>
          <Button className="px-3 py-1.5" onClick={downloadStandalone} disabled={exporting}>
            {exporting ? 'Export…' : '↓ HTML-App'}
          </Button>
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

        <main className="overflow-y-auto rounded-panel border border-line-subtle bg-panel p-5">
          <h2 className="mb-4 text-sm font-ui text-fg">Vorschau</h2>
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
          {exportError && <p className="text-sm text-error">{exportError}</p>}
          <DataFlowPanel manifest={manifest} registry={registry} />
        </div>
      </div>
    </div>
  );
}

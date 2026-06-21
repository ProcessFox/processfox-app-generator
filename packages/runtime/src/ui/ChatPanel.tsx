import { useState, type FormEvent } from 'react';
import type { StreamEvent } from '../lib/agentStream.js';
import { ThinkingStream } from './ThinkingStream.js';
import { Markdown } from './Markdown.js';
import { Button, TextArea } from './primitives.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  /** For assistant turns: the progress events that produced this answer. */
  events?: StreamEvent[];
}

/**
 * Left column of the app workspace: the conversation that refines the generated
 * app. Presentational — the workspace owns the manifest and the send logic; this
 * renders the transcript, the live "thinking" of the in-flight turn, and the
 * input box.
 */
export function ChatPanel({
  messages,
  liveEvents,
  busy,
  error,
  onSend,
}: {
  messages: ChatMessage[];
  liveEvents: StreamEvent[];
  busy: boolean;
  error: string | null;
  onSend: (prompt: string) => void;
}) {
  const [draft, setDraft] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const prompt = draft.trim();
    if (!prompt || busy) return;
    onSend(prompt);
    setDraft('');
  }

  return (
    <aside className="flex h-full flex-col rounded-panel border border-line-subtle bg-panel">
      <header className="border-b border-line-subtle px-4 py-3">
        <h2 className="text-sm font-ui text-fg">App anpassen</h2>
        <p className="text-xs text-fg-tertiary">
          Beschreibe Änderungen — der Agent passt die App an.
        </p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-card bg-accent px-3 py-2 text-sm text-white">
              {m.text}
            </div>
          ) : (
            <div key={i} className="space-y-2">
              {m.events && m.events.length > 0 && (
                <ThinkingStream events={m.events} active={false} />
              )}
              {m.text && (
                <div className="max-w-[90%] rounded-card bg-level3 px-3 py-2">
                  <Markdown>{m.text}</Markdown>
                </div>
              )}
            </div>
          ),
        )}

        {busy && <ThinkingStream events={liveEvents} active />}

        {error && (
          <p className="rounded-card border border-error/30 bg-error/10 p-3 text-sm text-error">
            {error}
          </p>
        )}
      </div>

      <form onSubmit={submit} className="border-t border-line-subtle p-3">
        <TextArea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) submit(e);
          }}
          rows={2}
          placeholder="z. B. Mach den Akzent blau oder füge einen Filter hinzu…"
          className="resize-none"
        />
        <Button type="submit" disabled={busy || draft.trim().length === 0} className="mt-2 w-full">
          {busy ? 'Agent arbeitet…' : 'Senden'}
        </Button>
      </form>
    </aside>
  );
}

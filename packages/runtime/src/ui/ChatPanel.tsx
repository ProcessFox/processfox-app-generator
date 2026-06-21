import { useState, type FormEvent } from 'react';
import type { StreamEvent } from '../lib/agentStream.js';
import { ThinkingStream } from './ThinkingStream.js';

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
    <aside className="flex h-full flex-col rounded-xl border border-slate-200 bg-white">
      <header className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">App anpassen</h2>
        <p className="text-xs text-slate-500">
          Beschreibe Änderungen — der Agent passt die App an.
        </p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-lg bg-orange-600 px-3 py-2 text-sm text-white">
              {m.text}
            </div>
          ) : (
            <div key={i} className="space-y-2">
              {m.events && m.events.length > 0 && (
                <ThinkingStream events={m.events} active={false} />
              )}
              {m.text && (
                <div className="max-w-[90%] rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800">
                  {m.text}
                </div>
              )}
            </div>
          ),
        )}

        {busy && <ThinkingStream events={liveEvents} active />}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      <form onSubmit={submit} className="border-t border-slate-200 p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) submit(e);
          }}
          rows={2}
          placeholder="z. B. Mach den Akzent blau oder füge einen Filter hinzu…"
          className="w-full resize-none rounded-lg border border-slate-300 p-2 text-sm focus:border-orange-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || draft.trim().length === 0}
          className="mt-2 w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {busy ? 'Agent arbeitet…' : 'Senden'}
        </button>
      </form>
    </aside>
  );
}

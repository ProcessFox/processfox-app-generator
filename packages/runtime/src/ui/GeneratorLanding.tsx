import { useState } from 'react';
import { type AppManifest } from '@processfox/core';
import { streamGenerate, type StreamEvent } from '../lib/agentStream.js';
import { ThinkingStream } from './ThinkingStream.js';
import type { ChatMessage } from './ChatPanel.js';

export interface GeneratedApp {
  manifest: AppManifest;
  conversationId: string;
  /** Seed transcript for the workspace chat (the first prompt + the agent reply). */
  messages: ChatMessage[];
}

/**
 * Landing page: the creator types a prompt; the agent's progress streams live
 * ("thinking" visible). On success it hands the generated app up to App, which
 * navigates to the dedicated workspace sub-page.
 */
export function GeneratorLanding({ onGenerated }: { onGenerated: (app: GeneratedApp) => void }) {
  const [prompt, setPrompt] = useState(
    'Aus einer Excel-Produktliste pro Zeile ein sauber formatiertes Word-Dokument erzeugen.',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<StreamEvent[]>([]);

  async function generate() {
    setBusy(true);
    setError(null);
    setEvents([]);
    const collected: StreamEvent[] = [];
    let conversationId = '';
    try {
      const result = await streamGenerate({
        prompt,
        onEvent: (e) => {
          collected.push(e);
          if (e.type === 'conversation') conversationId = e.conversationId;
          setEvents([...collected]);
        },
      });
      if (!result.valid || !result.manifest) {
        throw new Error('Der Agent konnte keine gültige App erzeugen.');
      }
      const messages: ChatMessage[] = [
        { role: 'user', text: prompt },
        {
          role: 'assistant',
          text: result.finalText || 'App erstellt.',
          events: collected.filter((e) => e.type === 'tool' || e.type === 'validation'),
        },
      ];
      onGenerated({ manifest: result.manifest, conversationId, messages });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <label className="block text-sm font-medium text-slate-700">
          Beschreibe die gewünschte App
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          disabled={busy}
          className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-orange-500 focus:outline-none disabled:opacity-60"
        />
        <div className="mt-3">
          <button
            type="button"
            onClick={generate}
            disabled={busy || prompt.trim().length === 0}
            className="rounded-lg bg-orange-600 px-5 py-2.5 font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {busy ? 'Agent arbeitet…' : 'App generieren'}
          </button>
        </div>
        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>

      {(busy || events.length > 0) && <ThinkingStream events={events} active={busy} />}
    </div>
  );
}

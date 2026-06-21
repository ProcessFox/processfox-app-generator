import { useState } from 'react';
import { type AppManifest } from '@processfox/core';
import { streamGenerate, type StreamEvent } from '../lib/agentStream.js';
import { ThinkingStream } from './ThinkingStream.js';
import { Button, Card, TextArea } from './primitives.js';
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
      <Card className="p-6">
        <label className="block text-sm font-ui text-fg-secondary">
          Beschreibe die gewünschte App
        </label>
        <TextArea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          disabled={busy}
          className="mt-2"
        />
        <div className="mt-3">
          <Button onClick={generate} disabled={busy || prompt.trim().length === 0}>
            {busy ? 'Agent arbeitet…' : 'App generieren'}
          </Button>
        </div>
        {error && (
          <p className="mt-3 rounded-comfortable border border-error/30 bg-error/10 p-3 text-sm text-error">
            {error}
          </p>
        )}
      </Card>

      {(busy || events.length > 0) && <ThinkingStream events={events} active={busy} />}
    </div>
  );
}

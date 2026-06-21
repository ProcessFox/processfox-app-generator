import type { AppManifest } from '@processfox/core';

/** One validation problem reported by the agent (mirrors core's ValidationError). */
export interface AgentValidationError {
  message: string;
  [key: string]: unknown;
}

/** Final result of one agent turn (mirrors the agent's AgentResult). */
export interface AgentResult {
  manifest: AppManifest | null;
  valid: boolean;
  errors: AgentValidationError[];
  finalText: string;
  steps: number;
}

/**
 * Progress events streamed by POST /api/generate/stream. The runtime defines
 * these locally instead of importing from @processfox/agent (the runtime must
 * not depend on the agent).
 */
export type StreamEvent =
  | { type: 'conversation'; conversationId: string }
  | { type: 'step'; step: number }
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string; label: string }
  | { type: 'validation'; valid: boolean; errors: AgentValidationError[] }
  | { type: 'done'; result: AgentResult }
  | { type: 'error'; error: string };

export interface StreamGenerateArgs {
  prompt: string;
  /** Continue an existing conversation (multi-turn editing) when provided. */
  conversationId?: string;
  /** Called for each progress event as it arrives. */
  onEvent: (event: StreamEvent) => void;
  signal?: AbortSignal;
}

/**
 * POSTs a prompt to the streaming generate endpoint and dispatches each SSE
 * event to `onEvent`. Resolves with the final result (from the `done` event);
 * rejects on an `error` event or transport failure.
 */
export async function streamGenerate({
  prompt,
  conversationId,
  onEvent,
  signal,
}: StreamGenerateArgs): Promise<AgentResult> {
  const res = await fetch('/api/generate/stream', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, conversationId }),
    signal,
  });

  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Serverfehler (HTTP ${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: AgentResult | null = null;

  // Parse the SSE stream: events are separated by a blank line; each carries a
  // single `data: <json>` field.
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const chunk = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const line = chunk.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      const event = JSON.parse(line.slice('data:'.length).trim()) as StreamEvent;
      onEvent(event);
      if (event.type === 'done') result = event.result;
      if (event.type === 'error') throw new Error(event.error);
    }
  }

  if (!result) throw new Error('Stream endete ohne Ergebnis.');
  return result;
}

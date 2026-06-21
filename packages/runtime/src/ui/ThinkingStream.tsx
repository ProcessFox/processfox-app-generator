import type { StreamEvent } from '../lib/agentStream.js';

/**
 * Renders the live "thinking" of the agent: the stream of progress events
 * (narration text, tool steps, validation outcomes) as they arrive. Used on the
 * landing page while the first app is generated and inside the chat for each
 * follow-up turn.
 */
export function ThinkingStream({
  events,
  active,
}: {
  events: StreamEvent[];
  active: boolean;
}) {
  // Show step-by-step progress; the final narration text is rendered by the
  // caller as the assistant message, so we skip plain `text`/`done` here.
  const items = events.filter(
    (e) => e.type === 'tool' || e.type === 'validation' || e.type === 'text',
  );

  if (items.length === 0 && !active) return null;

  return (
    <div className="rounded-card border border-line-subtle bg-level3 p-3">
      <div className="flex items-center gap-2 text-xs font-ui text-fg-tertiary">
        {active && (
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
        )}
        <span>{active ? 'Agent denkt nach…' : 'Vorgehen'}</span>
      </div>
      <ol className="mt-2 space-y-1.5">
        {items.map((e, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            {e.type === 'tool' && (
              <>
                <span className="mt-0.5 text-fg-quaternary">→</span>
                <span className="text-fg-secondary">{e.label}</span>
              </>
            )}
            {e.type === 'validation' && (
              <>
                <span className="mt-0.5">{e.valid ? '✓' : '✗'}</span>
                <span className={e.valid ? 'text-success' : 'text-warning'}>
                  {e.valid
                    ? 'App-Entwurf ist gültig'
                    : `Entwurf wird korrigiert (${e.errors.length} Hinweis${e.errors.length === 1 ? '' : 'e'})`}
                </span>
              </>
            )}
            {e.type === 'text' && (
              <>
                <span className="mt-0.5 text-fg-quaternary">💬</span>
                <span className="italic text-fg-tertiary">{e.text}</span>
              </>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

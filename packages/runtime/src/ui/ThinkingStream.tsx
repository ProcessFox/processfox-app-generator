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
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        {active && (
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-orange-500" />
        )}
        <span>{active ? 'Agent denkt nach…' : 'Vorgehen'}</span>
      </div>
      <ol className="mt-2 space-y-1.5">
        {items.map((e, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            {e.type === 'tool' && (
              <>
                <span className="mt-0.5 text-slate-400">→</span>
                <span className="text-slate-700">{e.label}</span>
              </>
            )}
            {e.type === 'validation' && (
              <>
                <span className="mt-0.5">{e.valid ? '✓' : '✗'}</span>
                <span className={e.valid ? 'text-emerald-700' : 'text-amber-700'}>
                  {e.valid
                    ? 'App-Entwurf ist gültig'
                    : `Entwurf wird korrigiert (${e.errors.length} Hinweis${e.errors.length === 1 ? '' : 'e'})`}
                </span>
              </>
            )}
            {e.type === 'text' && (
              <>
                <span className="mt-0.5 text-slate-400">💬</span>
                <span className="italic text-slate-600">{e.text}</span>
              </>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

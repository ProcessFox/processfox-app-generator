import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders agent chat text as Markdown. Element styles map onto the Linear design
 * tokens so formatted replies (bold, lists, inline code, paragraphs) read like
 * the rest of the UI. Safe by construction — react-markdown does not use
 * dangerouslySetInnerHTML and raw HTML is not enabled.
 *
 * Generator-only: ChatPanel is not part of the exported StandalonePlayer, so
 * this dependency never lands in the single-file export bundle.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-fg-secondary">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => <strong className="font-strong text-fg">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded-standard bg-surface px-1 py-0.5 font-mono text-[0.85em] text-fg">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-card bg-level3 p-3 font-mono text-xs text-fg-secondary">
              {children}
            </pre>
          ),
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          h1: ({ children }) => <h3 className="font-strong text-fg">{children}</h3>,
          h2: ({ children }) => <h3 className="font-strong text-fg">{children}</h3>,
          h3: ({ children }) => <h3 className="font-ui text-fg">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-line-standard pl-3 text-fg-tertiary">
              {children}
            </blockquote>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

import type { ButtonHTMLAttributes, HTMLAttributes, TextareaHTMLAttributes } from 'react';
import type { ThemeMode } from './useThemeMode.js';

/**
 * Linear-styled UI primitives for the generator chrome. They centralise the
 * three things that are easy to get wrong and make the look generic if missed:
 * the signature weight 510 (`font-ui`), the multi-layer indigo focus ring
 * (`focus-ring`), and the controlled 150ms easing. Tokens come from index.css.
 */

type Variant = 'primary' | 'ghost' | 'subtle';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-comfortable px-4 py-2 text-sm font-ui ' +
  'transition duration-150 ease-default active:scale-[0.98] ' +
  'focus-visible:focus-ring disabled:pointer-events-none disabled:opacity-40';

const BUTTON_VARIANTS: Record<Variant, string> = {
  // The single accent. White-on-indigo at 510/14px clears the bold contrast bar.
  primary: 'bg-accent text-white hover:bg-accent-hover',
  ghost: 'border border-line-standard text-fg-secondary hover:bg-surface',
  subtle: 'border border-line-subtle bg-surface text-fg-secondary hover:bg-level3',
};

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    // eslint-disable-next-line react/button-has-type
    <button type={type} className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} {...props} />
  );
}

/** Icon-circle toggle for light/dark mode. 32px target, hover surface lift. */
export function ThemeToggle({ mode, onToggle }: { mode: ThemeMode; onToggle: () => void }) {
  const dark = mode === 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={dark ? 'Zu hellem Design wechseln' : 'Zu dunklem Design wechseln'}
      title={dark ? 'Helles Design' : 'Dunkles Design'}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-fg-tertiary transition duration-150 ease-default hover:bg-surface hover:text-fg-secondary focus-visible:focus-ring"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {dark ? (
          // Sun — currently dark, click returns to light.
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </>
        ) : (
          // Moon — currently light, click switches to dark.
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        )}
      </svg>
    </button>
  );
}

/** Panel surface: bg-panel + subtle border + panel radius. Padding is the caller's. */
export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-panel border border-line-subtle bg-panel ${className}`} {...props} />;
}

/** Text input/textarea with Linear focus treatment (indigo border + ring). */
export function TextArea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={
        'w-full rounded-comfortable border border-line-subtle bg-surface p-3 text-sm text-fg ' +
        'placeholder:text-fg-quaternary transition duration-150 ease-default ' +
        'focus:border-accent focus:outline-none focus-visible:focus-ring disabled:opacity-60 ' +
        className
      }
      {...props}
    />
  );
}

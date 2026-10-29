import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConference } from '../lib/store.jsx';
import { Button, cx } from './ui.jsx';
import { Icon } from './Icon.jsx';

/**
 * Pick the topics you care about. Modelled on ConflictDialog, but portalled to
 * <body>: it opens from the header, which is `glass` and would trap a `fixed` child.
 */
export function InterestsDialog({ open, onClose }) {
  const { tags = [], currentUser, saveInterests } = useConference();
  const topics = tags.filter((t) => t.kind === 'topic');
  const [draft, setDraft] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = busy ? () => {} : onClose;

  // Start from what is saved each time the dialog opens.
  useEffect(() => {
    if (open) setDraft(new Set(currentUser?.interests ?? []));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    ref.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [open]);

  if (!open) return null;

  const toggle = (name) => setDraft((prev) => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    return next;
  });

  const save = async () => {
    setBusy(true);
    const ok = await saveInterests(topics.map((t) => t.name).filter((n) => draft.has(n)));
    setBusy(false);
    if (ok) onClose({ saved: true });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] grid place-items-end sm:place-items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="interests-title"
      data-testid="interests-dialog"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => onClose()}
        disabled={busy}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div
        ref={ref}
        tabIndex={-1}
        className="glass relative flex max-h-[85dvh] w-full max-w-lg animate-rise flex-col rounded-t-2xl border border-hairline p-6 shadow-2xl shadow-black/70 focus:outline-none sm:rounded-2xl"
      >
        <h2 id="interests-title" className="font-display text-xl leading-tight">Your interests</h2>
        <p className="mt-1 text-[13px] text-muted">Tick the topics you want to hear about.</p>

        <div className="mt-4 flex flex-wrap gap-2 overflow-y-auto" role="group" aria-label="Topics">
          {topics.map((t) => {
            const on = draft.has(t.name);
            return (
              <button
                key={t.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                data-testid={`interest-${t.slug}`}
                onClick={() => toggle(t.name)}
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400',
                  on ? 'border-violet-400/50 bg-violet-500/15 text-violet-200' : 'border-hairline text-muted hover:bg-raised',
                )}
              >
                {/* Always rendered so a button is the same size ticked or not. */}
                <Icon name="check" className={cx('size-3', !on && 'invisible')} />
                {t.name}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onClose()} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={busy} data-testid="interests-save">
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

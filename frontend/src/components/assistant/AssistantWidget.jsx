import React, { useEffect, useRef, useState } from 'react';
import { AssistantMessage, UserMessage } from './ChatMessage';
import ResultsPanel from './ResultsPanel';
import { useAuth } from '../../contexts/AuthContext';
import { useAssistantChat } from '../../hooks/useAssistantChat';

const STARTERS = [
  "I have 40,000 points. What's the best way to use them for a hotel stay?",
  'Compare flight redemptions from Delhi to Mumbai',
  'Best hotel redemption in Goa for 3 nights, 5-star if possible',
  'Can I use wallet points for part of a fare?',
];

const MAX_CHARS = 1000;

function IconButton({ label, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-md text-ink-60 transition hover:bg-paper-soft hover:text-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Mark({ size = 22 }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-brass font-serif text-paper"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      aria-hidden="true"
    >
      L
    </span>
  );
}

// Mount with key={user.id} so a different signed-in user never sees the
// previous user's conversation (the remount discards all state).
//
// Floating, app-wide assistant: a launcher in the bottom-right corner opens a
// chat panel; "expand" adds the full recommendation, comparison and evidence view.
export default function AssistantWidget() {
  const { isAuthenticated } = useAuth();
  const chat = useAssistantChat();
  const { messages, busy, send, reset, selectedId, setSelectedId, selected } = chat;

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mobileView, setMobileView] = useState('chat');
  const [draft, setDraft] = useState('');
  const [unread, setUnread] = useState(false);
  const inputRef = useRef(null);
  const threadRef = useRef(null);
  const resultsRef = useRef(null);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
    if (open) inputRef.current?.focus();
  }, [open]);


  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (expanded) setExpanded(false);
      else setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, expanded]);

  if (!isAuthenticated) return null;

  const submit = async (text) => {
    if (!`${text ?? ''}`.trim() || busy) return;
    setDraft('');
    setMobileView('chat');
    const result = await send(text);
    if (result && !openRef.current) setUnread(true);
  };

  const openPanel = () => {
    setOpen(true);
    setUnread(false);
  };

  const showDetails = (id) => {
    setSelectedId(id);
    setExpanded(true);
    setMobileView('details');
  };

  const showEvidence = (id, tag) => {
    showDetails(id);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        resultsRef.current?.querySelector(`#evidence-${tag}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }),
    );
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={openPanel}
        aria-label="Open redemption assistant"
        className="fixed bottom-5 right-5 z-50 flex h-12 items-center gap-2.5 rounded-full bg-ink pl-2 pr-4 text-[13.5px] font-medium text-paper shadow-page transition hover:-translate-y-0.5 hover:bg-navy-deep focus:outline-none focus:ring-2 focus:ring-navy/30 focus:ring-offset-2 focus:ring-offset-paper"
      >
        <Mark size={32} />
        <span>Ask Ledger</span>
        {(busy || unread) && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className={`absolute inline-flex h-full w-full rounded-full bg-brass ${busy ? 'animate-ping opacity-60' : ''}`} />
            <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-paper bg-brass" />
          </span>
        )}
      </button>
    );
  }

  const thread = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={threadRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-60">
              I compare loyalty redemptions using your saved balances, a sample award catalog and program policies. Try:
            </p>
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="block w-full rounded-md border border-ink-10 bg-paper-soft/40 px-3 py-2 text-left text-[12.5px] text-ink-80 transition hover:border-navy/30 hover:bg-paper-card"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, index) =>
          m.role === 'user' ? (
            <UserMessage key={m.id} text={m.text} />
          ) : (
            <AssistantMessage
              key={m.id}
              message={m}
              busy={busy}
              selected={expanded && selectedId === m.id}
              onSelect={() => showDetails(m.id)}
              onCite={(tag) => showEvidence(m.id, tag)}
              onPick={submit}
              onRetry={index === messages.length - 1 ? () => submit(m.prompt) : undefined}
            />
          ),
        )}
      </div>

      <form
        className="border-t border-ink-10 bg-paper-soft/40 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
      >
        <label htmlFor="assistant-input" className="sr-only">Ask about your points</label>
        <div className="flex items-end gap-2">
          <textarea
            id="assistant-input"
            ref={inputRef}
            value={draft}
            maxLength={MAX_CHARS}
            rows={2}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit(draft);
              }
            }}
            placeholder="Ask about your points…"
            className="min-h-[44px] flex-1 resize-none rounded-md border border-ink-10 bg-paper-card px-3 py-2.5 text-[13.5px] text-ink outline-none transition placeholder:text-ink-40 focus:border-navy focus:ring-2 focus:ring-navy/15"
          />
          <button type="submit" disabled={busy || !draft.trim()} className="btn-primary h-11 px-3.5" aria-label="Send">
            {busy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper/30 border-t-paper" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-1.5 flex justify-between font-mono text-[10px] text-ink-40">
          <span>Read-only · never books or transfers</span>
          <span>{draft.length}/{MAX_CHARS}</span>
        </p>
      </form>
    </div>
  );

  const panelSize = expanded
    ? 'inset-0 sm:inset-4 lg:left-auto lg:w-[min(1180px,calc(100vw-32px))]'
    : 'inset-0 sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(680px,calc(100vh-40px))] sm:w-[420px]';

  return (
    <>
      {expanded && (
        <div className="fixed inset-0 z-40 hidden bg-ink/20 backdrop-blur-[1px] sm:block" onClick={() => setExpanded(false)} aria-hidden="true" />
      )}
      <section
        role="dialog"
        aria-label="Redemption assistant"
        className={`fixed z-50 flex flex-col overflow-hidden border border-ink-10 bg-paper-card shadow-page animate-fadeUp sm:rounded-lg ${panelSize}`}
      >
        <header className="flex items-center justify-between gap-2 border-b border-ink-10 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {expanded && mobileView === 'details' && (
              <button type="button" onClick={() => setMobileView('chat')} className="btn-ghost h-8 shrink-0 whitespace-nowrap px-2 lg:hidden">
                ← Chat
              </button>
            )}
            <Mark />
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-medium text-ink">Redemption assistant</p>
              <p className="font-mono text-[9.5px] uppercase tracking-widelabel text-ink-40">
                {busy ? 'Working…' : 'Read-only'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <IconButton label="New conversation" onClick={reset} disabled={messages.length === 0}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </IconButton>
            <IconButton
              label={expanded ? 'Collapse' : 'Expand details'}
              onClick={() => {
                setExpanded((v) => !v);
                setMobileView(expanded ? 'chat' : 'details');
              }}
            >
              {expanded ? (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M10 2v4h4M6 14v-4H2M10 6l4-4M6 10l-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M10 2h4v4M6 14H2v-4M14 2l-5 5M2 14l5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </IconButton>
            <IconButton
              label="Close assistant"
              onClick={() => {
                setOpen(false);
                setExpanded(false);
              }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </IconButton>
          </div>
        </header>

        {expanded ? (
          <div className="flex min-h-0 flex-1 lg:grid lg:grid-cols-[400px_1fr]">
            <div className={`min-h-0 flex-1 flex-col border-ink-10 lg:flex lg:border-r ${mobileView === 'chat' ? 'flex' : 'hidden'}`}>
              {thread}
            </div>
            <div
              ref={resultsRef}
              className={`min-h-0 flex-1 overflow-y-auto bg-paper/60 px-4 py-5 sm:px-6 lg:block ${mobileView === 'details' ? 'block' : 'hidden'}`}
            >
              <ResultsPanel result={selected} />
            </div>
          </div>
        ) : (
          thread
        )}
      </section>
    </>
  );
}

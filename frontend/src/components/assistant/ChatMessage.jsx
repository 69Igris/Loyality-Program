import React from 'react';
import WorkflowTrace from './WorkflowTrace';
import { latestPhase, splitCitations, stepsFromEvents } from '../../utils/agent';
import { formatINR, formatPoints } from '../../utils/format';

function Citations({ text, onCite }) {
  return splitCitations(text).map((part, i) =>
    part.tag ? (
      <button
        key={i}
        type="button"
        onClick={() => onCite?.(part.tag)}
        title="Show policy evidence"
        className="mx-0.5 inline-flex -translate-y-px items-center rounded-sm2 border border-navy/25 bg-navy/5 px-1 font-mono text-[10px] text-navy hover:bg-navy/10"
      >
        {part.tag}
      </button>
    ) : (
      <React.Fragment key={i}>{part.text}</React.Fragment>
    ),
  );
}

function Chips({ items, onPick, disabled }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          disabled={disabled}
          onClick={() => onPick(item)}
          className="rounded-full border border-ink-10 bg-paper-card px-3 py-1 text-[12px] text-ink-80 transition hover:border-navy/40 hover:text-navy disabled:opacity-50"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function UserMessage({ text }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] whitespace-pre-wrap rounded-md rounded-br-sm2 bg-ink px-3.5 py-2.5 text-[13.5px] leading-relaxed text-paper">
        {text}
      </p>
    </div>
  );
}

// Small top-pick summary shown in the chat; the full breakdown opens in the details view.
function TopPick({ entry, selected, onOpen }) {
  const m = entry.metrics;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`mt-3 block w-full rounded-md border px-3 py-2.5 text-left transition ${
        selected ? 'border-moss/40 bg-moss-mist/40' : 'border-ink-10 bg-paper-soft/50 hover:border-navy/30'
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9.5px] uppercase tracking-widelabel text-moss">Top pick · score {entry.score.toFixed(1)}</span>
        <span className="text-[11.5px] font-medium text-navy">{selected ? 'Showing details' : 'Open details →'}</span>
      </span>
      <span className="mt-1 block text-[13px] font-medium text-ink">{entry.title}</span>
      <span className="block text-[11.5px] text-ink-60">{entry.programName}</span>
      <span className="mt-1.5 grid grid-cols-3 gap-2 font-mono text-[11.5px] tabular-nums text-ink-80">
        <span>{formatPoints(m.pointsRequired)} pts</span>
        <span>{formatINR(m.cashPayable, 0)} cash</span>
        <span className="text-moss">{formatINR(m.valuePerPoint)}/pt</span>
      </span>
    </button>
  );
}

export function AssistantMessage({ message, selected, onSelect, onPick, onCite, busy, onRetry }) {
  const { status, result, events = [], error } = message;

  if (status === 'streaming') {
    return (
      <div className="max-w-[92%] space-y-2">
        <WorkflowTrace live steps={stepsFromEvents(events)} phase={latestPhase(events) || 'Starting'} />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="max-w-[92%] rounded-md border border-clay/30 bg-clay-mist px-3.5 py-2.5 text-[13px] text-clay" role="alert">
        <p className="font-medium">The assistant couldn&apos;t answer</p>
        <p className="mt-0.5 text-clay/80">{error}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} disabled={busy} className="mt-2 text-[12px] font-medium underline underline-offset-4 disabled:opacity-50">
            Try again
          </button>
        )}
      </div>
    );
  }

  const hasResults = Boolean(result?.recommendation || result?.ineligible?.length || result?.evidence?.length);

  return (
    <div className="max-w-[92%] space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brass font-serif text-[12px] text-paper">L</span>
        <span className="text-[12px] font-medium text-ink">Ledger assistant</span>
        {result?.narrativeSource === 'llm' && <span className="font-mono text-[9.5px] uppercase tracking-widelabel text-ink-40">AI-written · fact-checked</span>}
      </div>

      <div className="rounded-md rounded-tl-sm2 border border-ink-10 bg-paper-card px-3.5 py-3 text-[13.5px] leading-relaxed text-ink-80">
        <p className="whitespace-pre-wrap"><Citations text={result?.message} onCite={onCite} /></p>

        {result?.assumptions?.length > 0 && (
          <ul className="mt-2.5 space-y-0.5 border-t border-ink-10 pt-2 text-[12px] text-ink-60">
            {result.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}

        {!hasResults && result?.notices?.length > 0 && (
          <ul className="mt-2.5 space-y-0.5 border-t border-ink-10 pt-2 text-[12px] text-ochre">
            {result.notices.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}

        {result?.recommendation ? (
          <TopPick entry={result.recommendation} selected={selected} onOpen={onSelect} />
        ) : (
          hasResults && (
            <button
              type="button"
              onClick={onSelect}
              className={`mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium ${selected ? 'text-moss' : 'text-navy hover:underline'}`}
            >
              {selected ? 'Showing details' : 'Open details →'}
            </button>
          )
        )}
      </div>

      {result?.clarification?.choices && <Chips items={result.clarification.choices} onPick={onPick} disabled={busy} />}

      <WorkflowTrace steps={result?.trace} />

      {result?.followUps?.length > 0 && (
        <div className="space-y-1.5">
          <p className="label">Ask next</p>
          <Chips items={result.followUps} onPick={onPick} disabled={busy} />
        </div>
      )}
    </div>
  );
}

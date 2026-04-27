import React from 'react';

function FlightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2 8.5l3-1 1.5-3.5L8 4l-1 3 3-1 .5 1.5L7 9l-1 3-1.5-1L4 8.5l-2 .5V7.5z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function FlightPlan({ steps = [] }) {
  return (
    <section className="surface flex flex-col">
      <header className="flex items-center justify-between border-b border-ink-10 px-6 py-4">
        <div className="flex items-center gap-2.5 text-navy">
          <FlightIcon />
          <h3 className="font-serif text-[20px] tracking-editorial text-ink">Flight ledger</h3>
        </div>
        <span className="pill-navy">Air</span>
      </header>

      <ol className="flex-1 divide-y divide-ink-10">
        {steps.length === 0 && (
          <li className="px-6 py-8 text-center text-[13px] text-ink-60">
            No flight allocation needed for this trip.
          </li>
        )}
        {steps.map((step, index) => (
          <li
            key={`${step}-${index}`}
            className="flex items-start gap-4 px-6 py-4 animate-fadeUp"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink-10 bg-paper-soft font-mono text-[11px] text-ink-60">
              {index + 1}
            </span>
            <p className="text-[14px] leading-relaxed text-ink-80">{step}</p>
          </li>
        ))}
      </ol>

      <footer className="flex items-center justify-between border-t border-ink-10 bg-paper-soft/40 px-6 py-3 text-[11.5px] text-ink-60">
        <span>Allocation order: program rate ↓</span>
        <span className="font-mono uppercase tracking-widelabel">Bounded</span>
      </footer>
    </section>
  );
}

export default FlightPlan;

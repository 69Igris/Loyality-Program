import React from 'react';

function HotelIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="11" height="9" stroke="currentColor" strokeWidth="1.1" />
      <line x1="1.5" y1="6" x2="12.5" y2="6" stroke="currentColor" strokeWidth="1.1" />
      <line x1="4" y1="11.5" x2="4" y2="9" stroke="currentColor" strokeWidth="1.1" />
      <line x1="10" y1="11.5" x2="10" y2="9" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

function HotelPlan({ items = [] }) {
  return (
    <section className="surface flex flex-col">
      <header className="flex items-center justify-between border-b border-ink-10 px-6 py-4">
        <div className="flex items-center gap-2.5 text-clay">
          <HotelIcon />
          <h3 className="font-serif text-[20px] tracking-editorial text-ink">Stay ledger</h3>
        </div>
        <span className="pill-clay">Hotel</span>
      </header>

      <ol className="flex-1 divide-y divide-ink-10">
        {items.length === 0 && (
          <li className="px-6 py-8 text-center text-[13px] text-ink-60">
            No hotel allocation needed for this trip.
          </li>
        )}
        {items.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="flex items-start gap-4 px-6 py-4 animate-fadeUp"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink-10 bg-paper-soft font-mono text-[11px] text-ink-60">
              {index + 1}
            </span>
            <p className="text-[14px] leading-relaxed text-ink-80">{item}</p>
          </li>
        ))}
      </ol>

      <footer className="flex items-center justify-between border-t border-ink-10 bg-paper-soft/40 px-6 py-3 text-[11.5px] text-ink-60">
        <span>Post-flight balance carries over</span>
        <span className="font-mono uppercase tracking-widelabel">Per-program</span>
      </footer>
    </section>
  );
}

export default HotelPlan;

import React, { useEffect, useState } from 'react';

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₹0';
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)}`;
}

function formatNumber(value) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
}

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const safeTarget = Number(target) || 0;
    if (safeTarget === 0) {
      setValue(0);
      return;
    }
    let raf;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(safeTarget * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function MicroLabel({ children, tone = 'ink' }) {
  const color = tone === 'brass' ? 'text-brass' : tone === 'paper' ? 'text-paper/70' : 'text-ink-60';
  return (
    <p className={`font-mono text-[9.5px] uppercase tracking-widelabel ${color}`}>{children}</p>
  );
}

function parseRoute(summary) {
  if (typeof summary !== 'string') return [null, null];
  const m = summary.match(/for\s+(.+?)\s*[→to]+\s*(.+)$/i);
  if (m) return [m[1].trim(), m[2].trim()];
  return [null, null];
}

function airportish(city) {
  if (!city) return '—';
  return city.slice(0, 3).toUpperCase();
}

function StrategyCard({ summary, effectiveCost, savings, pointsUsed, remainingCash }) {
  const animatedSavings = useCountUp(savings || 0);
  const animatedCost = useCountUp(effectiveCost || 0);
  const [from, to] = parseRoute(summary);

  return (
    <article className="surface relative overflow-hidden">
      {/* Top brass strip — subtle luxury accent */}
      <div className="h-[3px] w-full bg-brass" />

      {/* Header */}
      <header className="flex items-center justify-between border-b border-ink-10 px-6 py-3 sm:px-7">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-moss/30 bg-moss-mist px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-widelabel text-moss">
            <span className="h-1 w-1 rounded-full bg-moss" />
            Recommended
          </span>
          <p className="font-mono text-[10px] uppercase tracking-widelabel text-ink-60">
            Strategy 01
          </p>
        </div>
        <p className="hidden font-mono text-[10px] uppercase tracking-widelabel text-ink-40 sm:block">
          Computed live
        </p>
      </header>

      {/* Route — refined, smaller */}
      <div className="px-6 pt-7 sm:px-8">
        <MicroLabel tone="brass">Itinerary</MicroLabel>
        <div className="mt-2 flex items-end justify-between gap-6">
          <div>
            <p className="font-serif text-[36px] leading-[0.9] tracking-editorial text-ink sm:text-[44px]">
              {airportish(from)}
            </p>
            <p className="mt-1.5 text-[12.5px] text-ink-60">{from || '—'}</p>
          </div>

          <div className="hidden flex-1 items-center pb-3 sm:flex">
            <span className="h-px flex-1 border-t border-dashed border-ink-20" />
            <svg width="14" height="14" viewBox="0 0 22 22" className="mx-2.5 text-brass" aria-hidden="true">
              <path d="M3 14 L 18 10 L 16 5 L 19 4 L 21 9 L 20 14 L 5 18 Z" fill="currentColor" />
            </svg>
            <span className="h-px flex-1 border-t border-dashed border-ink-20" />
          </div>

          <div className="text-right">
            <p className="font-serif text-[36px] leading-[0.9] tracking-editorial text-ink sm:text-[44px]">
              {airportish(to)}
            </p>
            <p className="mt-1.5 text-[12.5px] text-ink-60">{to || '—'}</p>
          </div>
        </div>
      </div>

      {/* Numbers — tighter, smaller display type */}
      <div className="mt-7 grid grid-cols-1 divide-y divide-ink-10 px-6 pb-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8">
        <div className="py-3 sm:py-2 sm:pl-0 sm:pr-6">
          <MicroLabel>Effective cost</MicroLabel>
          <p className="num-display mt-1 text-[24px] leading-none text-ink sm:text-[28px]">
            {formatCurrency(animatedCost)}
          </p>
        </div>
        <div className="py-3 sm:px-6 sm:py-2">
          <MicroLabel>Savings vs cash</MicroLabel>
          <p className="num-display shine-once mt-1 text-[24px] leading-none text-moss sm:text-[28px]">
            {formatCurrency(animatedSavings)}
          </p>
        </div>
        <div className="py-3 sm:py-2 sm:pl-6 sm:pr-0">
          <MicroLabel>Points spent</MicroLabel>
          <p className="num-display mt-1 text-[24px] leading-none text-ink sm:text-[28px]">
            {formatNumber(pointsUsed)}
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-10 bg-paper-soft/40 px-6 py-3 text-[11.5px] text-ink-60 sm:px-8">
        <span>
          Remaining cash leg:{' '}
          <span className="font-mono tabular-nums text-ink">{formatCurrency(remainingCash)}</span>
        </span>
        <span className="font-mono uppercase tracking-widelabel text-ink-40">
          v0.7 · Ledger
        </span>
      </footer>
    </article>
  );
}

export default StrategyCard;

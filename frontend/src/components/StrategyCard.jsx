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
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(safeTarget * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function Stat({ label, value, accent }) {
  return (
    <div className="flex flex-col gap-1.5 px-6 py-5 first:pl-0 last:pr-0 sm:py-6">
      <p className="label">{label}</p>
      <p className={`num-display text-[34px] leading-none sm:text-[40px] ${
        accent === 'moss' ? 'text-moss' : accent === 'clay' ? 'text-clay' : 'text-ink'
      }`}>
        {value}
      </p>
    </div>
  );
}

function StrategyCard({ summary, effectiveCost, savings, pointsUsed, remainingCash }) {
  const animatedSavings = useCountUp(savings || 0);
  const animatedCost = useCountUp(effectiveCost || 0);

  return (
    <section className="surface overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center justify-between gap-4 border-b border-ink-10 bg-paper-soft/50 px-6 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="pill-moss">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor">
              <circle cx="4.5" cy="4.5" r="4.5" />
            </svg>
            Recommended
          </span>
          <p className="text-[12.5px] text-ink-60">{summary}</p>
        </div>
        <p className="hidden font-mono text-[10.5px] uppercase tracking-widelabel text-ink-40 sm:block">
          Strategy 01 of {1}
        </p>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 divide-y divide-ink-10 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <div className="px-6 py-6 sm:col-span-2 sm:py-8">
          <p className="label">Effective cost</p>
          <p className="mt-2 num-display text-[56px] leading-[1] text-ink sm:text-[68px]">
            {formatCurrency(animatedCost)}
          </p>
          <p className="mt-3 text-[13px] text-ink-60">
            After bounded redemption and best-card top-up.
          </p>
        </div>

        <Stat label="Savings vs cash" value={formatCurrency(animatedSavings)} accent="moss" />
        <Stat
          label="Points spent"
          value={formatNumber(pointsUsed)}
        />
      </div>

      {/* Footer meta */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-10 px-6 py-4 text-[12px] text-ink-60 sm:px-7">
        <span>Remaining cash leg: <span className="tnum text-ink">{formatCurrency(remainingCash)}</span></span>
        <span className="font-mono uppercase tracking-widelabel text-ink-40">Computed live · server</span>
      </div>
    </section>
  );
}

export default StrategyCard;

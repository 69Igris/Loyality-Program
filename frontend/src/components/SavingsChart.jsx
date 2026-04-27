import React from 'react';

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₹0';
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)}`;
}

function SavingsChart({ savings, effectiveCost }) {
  const normalizedSavings = Math.max(0, Number(savings) || 0);
  const normalizedEffective = Math.max(0, Number(effectiveCost) || 0);
  const originalCost = normalizedSavings + normalizedEffective;
  const savingsPercent = originalCost > 0 ? (normalizedSavings / originalCost) * 100 : 0;
  const paidPercent = 100 - savingsPercent;

  return (
    <section className="surface p-6 sm:p-7">
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <p className="label">Comparative cost</p>
          <h3 className="mt-1 font-serif text-[22px] tracking-editorial text-ink">
            Cash booking vs. optimized plan
          </h3>
        </div>
        <p className="hidden font-mono text-[10.5px] uppercase tracking-widelabel text-ink-40 sm:block">
          {savingsPercent.toFixed(1)}% reduction
        </p>
      </div>

      {/* Stacked bar */}
      <div className="overflow-hidden rounded-md border border-ink-10">
        <div className="grid grid-cols-2 divide-x divide-ink-10 border-b border-ink-10 bg-paper-soft/40 text-[11px] text-ink-60">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="label">Without points</span>
            <span className="num-display text-[18px] text-ink">{formatCurrency(originalCost)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="label-strong">With Ledger</span>
            <span className="num-display text-[18px] text-moss">{formatCurrency(normalizedEffective)}</span>
          </div>
        </div>

        <div className="relative h-3 w-full bg-paper-soft">
          <div
            className="h-full bg-ink/85 transition-[width] duration-700 ease-out"
            style={{ width: `${paidPercent}%` }}
          />
          <div
            className="absolute right-0 top-0 h-full bg-moss transition-[width] duration-700 ease-out"
            style={{ width: `${savingsPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-2 divide-x divide-ink-10 text-[11.5px]">
          <div className="flex items-center gap-2 px-4 py-2.5 text-ink-60">
            <span className="h-2 w-2 rounded-sm2 bg-ink" />
            Paid · {paidPercent.toFixed(0)}%
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 text-moss">
            <span className="h-2 w-2 rounded-sm2 bg-moss" />
            Saved · {savingsPercent.toFixed(0)}%
          </div>
        </div>
      </div>

      <p className="mt-4 text-[12.5px] text-ink-60">
        Savings are computed as the delta between the cash-only price and the
        effective cost after redemption and card top-up.
      </p>
    </section>
  );
}

export default SavingsChart;

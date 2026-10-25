import React, { useState } from 'react';
import { CRITERION_LABELS, formatINR, formatPoints } from '../../utils/format';

function HeadToHead({ data, first, second }) {
  if (!data || !second) return null;
  const advantages = data.criteria.filter((c) => c.delta !== 0);
  return (
    <div className="border-t border-ink-10 px-5 py-4">
      <p className="label">Why #1 beats #2</p>
      <p className="mt-1 text-[13px] text-ink-80">
        <span className="font-medium text-ink">{first.title}</span> leads{' '}
        <span className="font-medium text-ink">{second.title}</span> by{' '}
        <span className="font-mono tabular-nums">{data.scoreGap.toFixed(1)}</span> points.
      </p>
      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {advantages.map((c) => (
          <li key={c.criterion} className="flex items-center justify-between gap-3 rounded-sm2 bg-paper-soft/60 px-2.5 py-1.5 text-[12px]">
            <span className="text-ink-80">{CRITERION_LABELS[c.criterion]}</span>
            <span className={`font-mono tabular-nums ${c.delta > 0 ? 'text-moss' : 'text-clay'}`}>
              {c.delta > 0 ? '+' : '−'}
              {Math.abs(c.delta).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ComparisonTable({ recommendation, alternatives, ineligible, headToHead }) {
  const [showExcluded, setShowExcluded] = useState(false);
  const rows = [recommendation, ...alternatives].filter(Boolean);

  return (
    <section className="surface overflow-hidden">
      <header className="flex items-baseline justify-between gap-3 px-5 pt-4">
        <div>
          <p className="label">Ranked alternatives</p>
          <h3 className="mt-1 font-serif text-[20px] text-ink">How the options compare</h3>
        </div>
        <p className="hidden font-mono text-[10px] uppercase tracking-widelabel text-ink-40 sm:block">
          {rows.length} eligible · {ineligible.length} excluded
        </p>
      </header>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[12.5px]">
          <thead>
            <tr className="border-y border-ink-10 bg-paper-soft/50 font-mono text-[9.5px] uppercase tracking-widelabel text-ink-60">
              <th className="px-5 py-2 font-medium">#</th>
              <th className="py-2 font-medium">Option</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Points</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Cash</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-medium">₹ / pt</th>
              <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Vs base</th>
              <th className="px-5 py-2 text-right font-medium">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-10">
            {rows.map((row) => (
              <tr key={row.id} className={row.rank === 1 ? 'bg-moss-mist/40' : ''}>
                <td className="px-5 py-2.5 font-mono text-ink-40">{String(row.rank).padStart(2, '0')}</td>
                <td className="py-2.5 pr-3">
                  <p className="font-medium text-ink">{row.title}</p>
                  <p className="text-[11.5px] text-ink-60">{row.programName}</p>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums">{formatPoints(row.metrics.pointsRequired)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums">{formatINR(row.metrics.cashPayable, 0)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums">{formatINR(row.metrics.valuePerPoint)}</td>
                <td
                  className={`whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums ${row.metrics.valueRatio >= 1 ? 'text-moss' : 'text-clay'}`}
                >
                  {row.metrics.valueRatio}×
                </td>
                <td className="px-5 py-2.5 text-right font-mono tabular-nums text-ink">{row.score.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <HeadToHead data={headToHead} first={rows[0]} second={rows[1]} />

      {ineligible.length > 0 && (
        <div className="border-t border-ink-10 px-5 py-3">
          <button
            type="button"
            onClick={() => setShowExcluded((v) => !v)}
            className="flex w-full items-center justify-between text-left text-[12.5px] font-medium text-ink-80 hover:text-ink"
            aria-expanded={showExcluded}
          >
            <span>Excluded by hard constraints ({ineligible.length})</span>
            <svg width="12" height="12" viewBox="0 0 12 12" className={`transition ${showExcluded ? 'rotate-180' : ''}`} aria-hidden="true">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            </svg>
          </button>
          {showExcluded && (
            <ul className="mt-2 space-y-1.5">
              {ineligible.map((item) => (
                <li key={item.id} className="text-[12px]">
                  <span className="text-ink">{item.title}</span>
                  <span className="text-ink-40"> · {item.programName}</span>
                  <p className="text-clay">{item.reasons.join(' ')}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

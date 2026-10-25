import React from 'react';
import { CRITERION_LABELS, PRESET_LABELS, formatINR, formatPoints, titleCase } from '../../utils/format';

function Metric({ label, value, tone = 'ink' }) {
  const color = tone === 'moss' ? 'text-moss' : 'text-ink';
  return (
    <div className="py-2.5 sm:py-1">
      <p className="font-mono text-[9.5px] uppercase tracking-widelabel text-ink-60">{label}</p>
      <p className={`num-display mt-1 text-[24px] leading-none ${color}`}>{value}</p>
    </div>
  );
}

function ScoreBars({ entry, weights }) {
  return (
    <div className="space-y-2">
      {Object.entries(weights || {}).map(([key, weight]) => {
        const value = entry.criteria?.[key] ?? 0;
        return (
          <div key={key} className="grid grid-cols-[120px_1fr_48px] items-center gap-3 text-[12px]">
            <span className="text-ink-80">
              {CRITERION_LABELS[key] || key}
              <span className="ml-1 font-mono text-[10px] text-ink-40">×{weight}</span>
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-ink-10">
              <span className="block h-full rounded-full bg-navy" style={{ width: `${Math.round(value * 100)}%` }} />
            </span>
            <span className="text-right font-mono tabular-nums text-ink-60">{entry.contributions?.[key]?.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}

function routeLine(entry) {
  if (entry.category === 'flight') return `${titleCase(entry.origin)} → ${titleCase(entry.destination)}`;
  return `${titleCase(entry.destination)} · ${entry.nights} night${entry.nights === 1 ? '' : 's'}`;
}

export default function RecommendationCard({ entry, weighting, calculations }) {
  const m = entry.metrics;
  return (
    <article className="surface overflow-hidden">
      <div className="h-[3px] w-full bg-brass" />
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-10 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="pill-moss">
            <span className="h-1 w-1 rounded-full bg-moss" />
            Recommended
          </span>
          <span className="pill">{entry.category}</span>
          {entry.dataSource === 'sample' && <span className="pill-clay">Sample data</span>}
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widelabel text-ink-60">
          Score {entry.score.toFixed(1)} · {PRESET_LABELS[weighting?.preset] || weighting?.preset}
        </p>
      </header>

      <div className="px-5 pt-5">
        <p className="font-mono text-[10px] uppercase tracking-widelabel text-brass">{routeLine(entry)}</p>
        <h3 className="mt-1.5 font-serif text-[26px] leading-tight text-ink">{entry.title}</h3>
        <p className="mt-1 text-[13px] text-ink-60">
          {entry.programName}
          {entry.attributes?.nonstop && ' · nonstop'}
          {entry.attributes?.stars && ` · ${entry.attributes.stars}-star`}
          {entry.attributes?.refundable && ' · refundable'}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-6 px-5 pb-4 sm:grid-cols-4">
        <Metric label="Points" value={formatPoints(m.pointsRequired)} />
        <Metric label="Cash payable" value={formatINR(m.cashPayable, 0)} />
        <Metric label="Value / point" value={formatINR(m.valuePerPoint)} tone="moss" />
        <Metric label="Vs baseline" value={`${m.valueRatio}×`} tone={m.valueRatio >= 1 ? 'moss' : 'ink'} />
      </div>

      {entry.reasons?.length > 0 && (
        <ul className="space-y-1 border-t border-ink-10 px-5 py-3 text-[13px] text-ink-80">
          {entry.reasons.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span className="text-brass">—</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-5 border-t border-ink-10 bg-paper-soft/40 px-5 py-4 lg:grid-cols-2">
        <div>
          <p className="label mb-2">The math</p>
          <dl className="space-y-2">
            {calculations.map((calc) => (
              <div key={calc.label} className="text-[12.5px]">
                <dt className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-ink">{calc.label}</span>
                  <span className="font-mono tabular-nums text-moss">{calc.result}</span>
                </dt>
                <dd className="font-mono text-[11px] text-ink-60">{calc.formula}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <p className="label mb-2">Score breakdown</p>
          <ScoreBars entry={entry} weights={weighting?.weights} />
          <p className="mt-2 text-[11px] text-ink-40">Score = 100 × Σ weight × criterion. Computed by the backend, not the AI.</p>
        </div>
      </div>
    </article>
  );
}

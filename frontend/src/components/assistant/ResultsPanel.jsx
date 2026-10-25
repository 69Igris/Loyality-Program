import React from 'react';
import ComparisonTable from './ComparisonTable';
import EvidenceList from './EvidenceList';
import RecommendationCard from './RecommendationCard';

function Notices({ notices }) {
  if (!notices?.length) return null;
  return (
    <div className="flex items-start gap-3 rounded-md border border-ochre/40 bg-ochre/[0.06] px-4 py-3 text-[12.5px] text-ink-80">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-[1px] shrink-0 text-ochre" aria-hidden="true">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <ul className="space-y-1">
        {notices.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </div>
  );
}

function EmptyResults() {
  return (
    <div className="flex h-full min-h-[320px] flex-col justify-center px-2 py-10">
      <p className="font-mono text-[10.5px] uppercase tracking-widelabel text-brass">How it works</p>
      <h2 className="mt-2 font-serif text-[26px] leading-tight text-ink">Ask in plain words. Get ranked, explained redemptions.</h2>
      <ol className="mt-6 space-y-4 text-[13.5px] text-ink-80">
        {[
          ['Understands', 'Destination, dates, budget and preferences — and asks when something essential is missing.'],
          ['Uses tools', 'Reads your saved balances, searches the award catalog and retrieves program policies.'],
          ['Scores deterministically', 'Value per point, cash, points and preference match are computed by the backend, never guessed.'],
          ['Explains', 'Shows the math, the alternatives, the policy evidence and every step it took.'],
        ].map(([title, body], i) => (
          <li key={title} className="flex gap-4">
            <span className="font-mono text-[11px] text-ink-40">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <p className="font-medium text-ink">{title}</p>
              <p className="text-ink-60">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function ResultsPanel({ result }) {
  if (!result) return <EmptyResults />;
  return (
    <div className="space-y-5 animate-fadeUp">
      <Notices notices={result.notices} />
      {result.recommendation ? (
        <>
          <RecommendationCard entry={result.recommendation} weighting={result.weighting} calculations={result.calculations} />
          <ComparisonTable
            recommendation={result.recommendation}
            alternatives={result.alternatives}
            ineligible={result.ineligible}
            headToHead={result.headToHead}
          />
        </>
      ) : (
        result.ineligible?.length > 0 && (
          <ComparisonTable recommendation={null} alternatives={[]} ineligible={result.ineligible} headToHead={null} />
        )
      )}
      <EvidenceList evidence={result.evidence || []} status={result.evidenceStatus} />
    </div>
  );
}

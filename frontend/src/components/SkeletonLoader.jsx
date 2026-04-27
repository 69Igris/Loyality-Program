import React from 'react';

function SkeletonLine({ width = '100%' }) {
  return <div className="skeleton h-3" style={{ width }} />;
}

function SkeletonLoader() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-clay" />
        <p className="font-mono text-[11px] uppercase tracking-widelabel text-ink-60">
          Computing redemption ledger…
        </p>
      </div>

      <div className="surface overflow-hidden">
        <div className="border-b border-ink-10 bg-paper-soft/50 px-6 py-4">
          <SkeletonLine width="35%" />
        </div>
        <div className="grid grid-cols-1 divide-y divide-ink-10 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="space-y-3 px-6 py-7 sm:col-span-2">
            <SkeletonLine width="40%" />
            <div className="skeleton h-12 w-3/4" />
          </div>
          <div className="space-y-3 px-6 py-7">
            <SkeletonLine width="60%" />
            <div className="skeleton h-9 w-1/2" />
          </div>
          <div className="space-y-3 px-6 py-7">
            <SkeletonLine width="50%" />
            <div className="skeleton h-9 w-2/3" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="surface">
            <div className="border-b border-ink-10 px-6 py-4">
              <SkeletonLine width="40%" />
            </div>
            <div className="space-y-4 p-6">
              <SkeletonLine />
              <SkeletonLine width="92%" />
              <SkeletonLine width="78%" />
              <SkeletonLine width="65%" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SkeletonLoader;

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const STAGES = [
  'Pricing the route',
  'Reading your wallet',
  'Allocating points to flights',
  'Allocating points to stays',
  'Picking the best card',
  'Composing the strategy',
];

function NodeDot({ active, done }) {
  return (
    <span className="relative flex h-3 w-3 items-center justify-center">
      <span className={`absolute h-3 w-3 rounded-full transition-colors duration-300 ${
        done ? 'bg-moss' : active ? 'bg-clay' : 'bg-ink-20'
      }`} />
      {active && (
        <span className="absolute h-3 w-3 animate-ping rounded-full bg-clay/60" />
      )}
    </span>
  );
}

export default function SkeletonLoader() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setStage((s) => (s < STAGES.length - 1 ? s + 1 : s));
    }, 650);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-8">
      {/* Status header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-clay" />
          <p className="font-mono text-[11px] uppercase tracking-widelabel text-ink-60">
            Computing redemption ledger…
          </p>
        </div>
        <p className="hidden font-mono text-[10.5px] uppercase tracking-widelabel text-ink-40 sm:block">
          live · single pass
        </p>
      </div>

      {/* Compute timeline */}
      <div className="surface relative overflow-hidden p-6">
        <div className="absolute inset-x-6 top-9 h-px bg-ink-10" />
        <ol className="relative grid grid-cols-2 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          {STAGES.map((label, i) => (
            <li key={label} className="flex flex-col items-start gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-paper-card">
                <NodeDot active={i === stage} done={i < stage} />
              </div>
              <p className={`text-[11.5px] leading-tight transition-colors duration-300 ${
                i <= stage ? 'text-ink' : 'text-ink-40'
              }`}>
                {label}
              </p>
            </li>
          ))}
        </ol>

        {/* Live status line */}
        <div className="mt-6 flex h-6 items-center border-t border-ink-10 pt-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={STAGES[stage]}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="font-mono text-[11.5px] uppercase tracking-widelabel text-ink-60"
            >
              › {STAGES[stage]}…
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Two-pane skeleton stand-ins */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="surface">
            <div className="border-b border-ink-10 px-6 py-4">
              <div className="skeleton h-4 w-1/3" />
            </div>
            <div className="space-y-4 p-6">
              {[1, 0.92, 0.78, 0.65, 0.5].map((w, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.3 }}
                  className="skeleton h-3"
                  style={{ width: `${w * 100}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

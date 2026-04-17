import React, { useEffect, useState } from 'react';
import { animate, motion } from 'framer-motion';

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '₹0';
  }

  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount)}`;
}

function StrategyCard({ summary, effectiveCost, savings }) {
  const normalizedCost = Number(effectiveCost) || 0;
  const normalizedSavings = Number(savings) || 0;
  const [displaySavings, setDisplaySavings] = useState(0);

  useEffect(() => {
    const controls = animate(0, normalizedSavings, {
      duration: 1.15,
      ease: 'easeOut',
      onUpdate: (value) => setDisplaySavings(value),
    });

    return () => controls.stop();
  }, [normalizedSavings]);

  return (
    <motion.section
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 190, damping: 18 }}
      className="relative overflow-hidden rounded-3xl"
    >
      <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-r from-cyan-400/40 via-indigo-400/35 to-fuchsia-400/35 blur-lg" />

      <div className="glass-card relative p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Best Strategy</p>
            <h2 className="mt-2 text-2xl font-black text-slate-100 sm:text-3xl">{summary}</h2>
          </div>
          <span className="inline-flex h-fit items-center rounded-full border border-orange-300/40 bg-orange-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-100">
            🔥 Optimal Choice
          </span>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="rounded-2xl border border-white/15 bg-slate-900/50 p-5"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Effective Cost</p>
            <p className="mt-2 text-4xl font-black text-slate-100">{formatCurrency(normalizedCost)}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-5"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/90">Savings</p>
            <p className="mt-2 text-4xl font-black text-emerald-300">{formatCurrency(displaySavings)}</p>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

export default StrategyCard;

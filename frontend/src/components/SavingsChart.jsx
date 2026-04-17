import React from 'react';
import { motion } from 'framer-motion';

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '₹0';
  }

  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount)}`;
}

function SavingsChart({ savings, effectiveCost }) {
  const normalizedSavings = Number(savings) || 0;
  const normalizedEffective = Number(effectiveCost) || 0;
  const originalCost = Math.max(0, normalizedSavings + normalizedEffective);
  const savingsPercent = originalCost > 0 ? Math.min(100, (normalizedSavings / originalCost) * 100) : 0;

  return (
    <section className="glass-card p-6 sm:p-7">
      <h3 className="text-xl font-bold text-slate-100">Savings Visualization</h3>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Full Cash Cost</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-100">{formatCurrency(originalCost)}</p>
        </div>

        <div className="rounded-xl border border-emerald-300/35 bg-emerald-400/10 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-100/90">Optimized Cost</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-300">{formatCurrency(normalizedEffective)}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-slate-900/45 p-4">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
          <span>Saved vs Original</span>
          <span className="font-semibold text-emerald-300">{savingsPercent.toFixed(0)}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-800">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${savingsPercent}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
          />
        </div>
      </div>
    </section>
  );
}

export default SavingsChart;

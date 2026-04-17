import React from 'react';
import { motion } from 'framer-motion';

function FlightPlan({ steps = [] }) {
  return (
    <section className="glass-card p-6 sm:p-7">
      <h3 className="text-xl font-bold text-slate-100">Flight Plan</h3>
      <p className="mt-1 text-sm text-slate-400">Step-by-step redemption timeline</p>

      <div className="relative mt-6 space-y-4">
        {(steps || []).map((step, index) => (
          <motion.div
            key={`${step}-${index}`}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 * index + 0.1, duration: 0.28 }}
            className="relative pl-14"
          >
            {index < steps.length - 1 && (
              <span className="absolute left-[18px] top-10 h-[calc(100%+10px)] w-px bg-gradient-to-b from-cyan-400/70 to-indigo-500/30" />
            )}
            <span className="absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/50 bg-cyan-400/15 text-sm font-bold text-cyan-100">
              {index + 1}
            </span>
            <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-200">
              {step}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default FlightPlan;

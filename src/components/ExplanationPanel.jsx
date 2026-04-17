import React from 'react';
import { motion } from 'framer-motion';

function ExplanationPanel({ explanation }) {
  return (
    <section className="glass-card p-6 sm:p-7">
      <div className="inline-flex items-center rounded-full border border-indigo-300/40 bg-indigo-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-100">
        AI Insight
      </div>

      <div className="mt-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/50 bg-cyan-400/15 text-xs font-bold text-cyan-100">
          AI
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="max-w-full rounded-2xl rounded-tl-sm border border-white/10 bg-slate-900/60 px-4 py-3 text-sm leading-relaxed text-slate-200"
        >
          <p className="whitespace-pre-line">{explanation}</p>
        </motion.div>
      </div>
    </section>
  );
}

export default ExplanationPanel;

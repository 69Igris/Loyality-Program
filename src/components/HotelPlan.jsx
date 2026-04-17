import React from 'react';
import { motion } from 'framer-motion';

function HotelPlan({ items = [] }) {
  return (
    <section className="glass-card p-6 sm:p-7">
      <h3 className="text-xl font-bold text-slate-100">Hotel Plan</h3>
      <p className="mt-1 text-sm text-slate-400">Conversion-focused stay strategy</p>

      <div className="mt-6 grid gap-3">
        {(items || []).map((item, index) => (
          <motion.div
            key={`${item}-${index}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * index + 0.12, duration: 0.3 }}
            className="rounded-xl border border-white/10 bg-slate-900/55 p-4 text-sm text-slate-200"
          >
            <div className="mb-2 inline-flex items-center rounded-full border border-fuchsia-300/35 bg-fuchsia-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-fuchsia-200">
              Stay Conversion
            </div>
            <p>{item}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default HotelPlan;

import React from 'react';
import { motion } from 'framer-motion';
import UploadCard from '../components/UploadCard';

function SearchPage() {
  return (
    <div className="space-y-10 sm:space-y-12">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="max-w-3xl"
      >
        <p className="mb-4 inline-flex rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-violet-200">
          Smart Travel Optimizer
        </p>
        <h1 className="text-4xl font-black leading-tight sm:text-6xl">
          <span className="gradient-title">Optimize Your Travel Like a Pro</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base text-slate-300 sm:text-lg">
          Upload your cards and loyalty programs. We find the smartest way to travel.
        </p>
      </motion.section>

      <UploadCard />
    </div>
  );
}

export default SearchPage;

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import ResultsPage from './pages/ResultsPage';

function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.38, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function App() {
  const location = useLocation();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute left-[-15%] top-[-15%] h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-[-12%] top-[18%] h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[35%] h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      <header className="relative z-20 border-b border-white/10 bg-slate-950/35 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            to="/"
            className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-100 transition hover:text-cyan-300"
          >
            Smart Travel Optimizer
          </Link>
          <span className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
            Product Demo
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={(
                <PageWrapper>
                  <SearchPage />
                </PageWrapper>
              )}
            />
            <Route
              path="/results"
              element={(
                <PageWrapper>
                  <ResultsPage />
                </PageWrapper>
              )}
            />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;

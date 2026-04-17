import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import ExplanationPanel from '../components/ExplanationPanel';
import FlightPlan from '../components/FlightPlan';
import HotelPlan from '../components/HotelPlan';
import SavingsChart from '../components/SavingsChart';
import StrategyCard from '../components/StrategyCard';
import { optimizeTrip } from '../services/api';

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '₹0';
  }

  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount)}`;
}

function LoadingDashboard() {
  return (
    <div className="space-y-4">
      <div className="shimmer-card h-44" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="shimmer-card h-56" />
        <div className="shimmer-card h-56" />
      </div>
      <div className="shimmer-card h-40" />
      <div className="shimmer-card h-32" />
    </div>
  );
}

function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!location.state) {
      navigate('/');
      return;
    }

    const fetchStrategy = async () => {
      setLoading(true);
      setError(null);

      const { trip, userData } = location.state;
      
      try {
        const optimizedPlan = await optimizeTrip({ userData, trip });
        setResult(optimizedPlan);
      } catch (err) {
        setError(err.message || 'Failed to compute strategy from backend.');
      } finally {
        setLoading(false);
      }
    };

    fetchStrategy();
  }, [location.state, navigate]);

  if (!location.state) return null;

  const alternatives = (result?.options || []).slice(1, 4);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="inline-flex w-fit items-center rounded-full border border-white/20 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/50 hover:text-cyan-200"
          onClick={() => navigate(-1)}
        >
          &larr; Back
        </button>
        <p className="rounded-full border border-indigo-300/35 bg-indigo-500/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-indigo-100">
          {`${location.state.trip.from} → ${location.state.trip.to}`}
        </p>
      </div>

      {loading && <LoadingDashboard />}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {error}
        </motion.div>
      )}

      {result && !loading && !error && (
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <StrategyCard
              summary={result.summary}
              effectiveCost={result.effective_cost}
              savings={result.savings}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.36 }}
            className="grid gap-6 lg:grid-cols-2"
          >
            <FlightPlan steps={result.flightPlan || []} />
            <HotelPlan items={result.hotelPlan || []} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <SavingsChart savings={result.savings} effectiveCost={result.effective_cost} />
          </motion.div>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card border-yellow-300/20 bg-yellow-500/[0.04] p-6 sm:p-7"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-100">Alternative Options</h3>
              <span className="rounded-full border border-yellow-300/45 bg-yellow-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-yellow-100">
                Warning: Less Optimal
              </span>
            </div>

            {alternatives.length === 0 ? (
              <p className="text-sm text-slate-400">No additional alternatives were generated for this itinerary.</p>
            ) : (
              <div className="space-y-3">
                {alternatives.map((option, index) => (
                  <details
                    key={`${option.name || 'option'}-${index}`}
                    className="group rounded-2xl border border-yellow-300/20 bg-yellow-500/[0.03] p-4 opacity-80 transition hover:opacity-100"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{option.name || `Option ${index + 2}`}</p>
                        <p className="text-xs text-slate-400">
                          Effective Cost: {formatCurrency(option.effective_cost)}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-yellow-200">Tap to view</span>
                    </summary>

                    <div className="mt-3 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-200">Flight Usage</p>
                        <ul className="list-disc space-y-1 pl-5">
                          {(option.usage?.flight || []).map((entry, itemIndex) => (
                            <li key={`${entry.program || 'f'}-${itemIndex}`}>{entry.line || entry.program}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-200">Hotel Usage</p>
                        <ul className="list-disc space-y-1 pl-5">
                          {(option.usage?.hotel || []).map((entry, itemIndex) => (
                            <li key={`${entry.program || 'h'}-${itemIndex}`}>{entry.line || entry.program}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </motion.section>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
            <ExplanationPanel explanation={result.explanation || 'Explanation currently unavailable.'} />
          </motion.div>

          <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            {`"You save ${formatCurrency(result.savings)} compared to full cash booking"`}
          </div>
        </div>
      )}
    </div>
  );
}

export default ResultsPage;

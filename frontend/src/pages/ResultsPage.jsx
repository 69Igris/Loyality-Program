import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ExplanationPanel from '../components/ExplanationPanel';
import FlightPlan from '../components/FlightPlan';
import HotelPlan from '../components/HotelPlan';
import SavingsChart from '../components/SavingsChart';
import SkeletonLoader from '../components/SkeletonLoader';
import StrategyCard from '../components/StrategyCard';
import { optimizeTrip } from '../services/api';

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₹0';
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount)}`;
}

const MIN_LOADING_MS = 600;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
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
      const startedAt = Date.now();
      const { trip, userData } = location.state;

      try {
        const optimizedPlan = await optimizeTrip({ userData, trip });
        setResult(optimizedPlan);
      } catch (err) {
        setError(err.message || 'Failed to compute strategy from backend.');
      } finally {
        const elapsed = Date.now() - startedAt;
        if (elapsed < MIN_LOADING_MS) await wait(MIN_LOADING_MS - elapsed);
        setLoading(false);
      }
    };

    fetchStrategy();
  }, [location.state, navigate]);

  if (!location.state) return null;

  const trip = location.state.trip;
  const alternatives = (result?.options || []).slice(1, 4);

  return (
    <div className="mx-auto max-w-[1180px] px-6 lg:px-10">
      {/* Sub-header */}
      <div className="flex flex-col gap-4 border-b border-ink-10 py-7 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="btn-ghost">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mr-1.5">
              <path d="M9 3L4 6L9 9" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
          <div className="hidden h-5 w-px bg-ink-10 sm:block" />
          <p className="label">Trip ledger</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-serif text-[20px] tracking-editorial text-ink">
            {trip.from}
          </span>
          <svg width="22" height="10" viewBox="0 0 22 10" fill="none" className="text-ink-40">
            <path d="M0 5h20M20 5l-4-4M20 5l-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-serif text-[20px] tracking-editorial text-ink">
            {trip.to}
          </span>
        </div>
      </div>

      {loading && (
        <div className="py-10">
          <SkeletonLoader />
        </div>
      )}

      {error && !loading && (
        <div className="my-10 flex items-start gap-3 rounded-md border border-clay/30 bg-clay-mist px-4 py-3 text-[13.5px] text-clay">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-[2px]">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 4v5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div>
            <p className="font-medium">Couldn't compute the strategy</p>
            <p className="mt-0.5 text-[12.5px] text-clay/80">{error}</p>
          </div>
        </div>
      )}

      {result && !loading && !error && (
        <div className="space-y-10 py-10 animate-fadeUp">
          {Array.isArray(result.profileNotes) && result.profileNotes.length > 0 && (
            <div className="flex items-start gap-3 rounded-md border border-ochre/40 bg-ochre/[0.06] px-4 py-3 text-[13px] text-ink-80">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-[2px] text-ochre">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
                <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div className="space-y-1">
                {result.profileNotes.map((note, i) => (
                  <p key={i}>
                    {note}
                    {note.includes('Add a card') && (
                      <>
                        {' '}
                        <Link to="/account" className="underline decoration-ink-20 underline-offset-4 hover:decoration-ink">
                          Open your account →
                        </Link>
                      </>
                    )}
                  </p>
                ))}
              </div>
            </div>
          )}

          <StrategyCard
            summary={result.summary}
            effectiveCost={result.effective_cost}
            savings={result.savings}
            pointsUsed={result.tracking?.pointsUsed}
            remainingCash={result.tracking?.remainingCash}
          />

          <SavingsChart savings={result.savings} effectiveCost={result.effective_cost} />

          <section>
            <div className="mb-5 flex items-baseline justify-between">
              <h3 className="font-serif text-[24px] text-ink">The plan, in two ledgers</h3>
              <p className="label hidden sm:block">Sequential allocation</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <FlightPlan steps={result.flightPlan || []} />
              <HotelPlan items={result.hotelPlan || []} />
            </div>
          </section>

          <ExplanationPanel explanation={result.explanation || 'Explanation currently unavailable.'} />

          {/* Alternatives */}
          <section className="surface p-6 sm:p-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="label">Alternatives</p>
                <h3 className="mt-1 font-serif text-[20px] text-ink">Less optimal — kept for transparency</h3>
              </div>
              <span className="pill-clay">Suboptimal</span>
            </div>

            {alternatives.length === 0 ? (
              <p className="text-[13.5px] text-ink-60">
                No alternative strategies were generated for this itinerary.
              </p>
            ) : (
              <div className="divide-y divide-ink-10">
                {alternatives.map((option, index) => (
                  <details
                    key={`${option.name || 'option'}-${index}`}
                    className="group py-3"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] uppercase tracking-widelabel text-ink-40">
                          {String(index + 2).padStart(2, '0')}
                        </span>
                        <p className="text-[14px] font-medium text-ink">
                          {option.name || `Alternative ${index + 2}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="num-display text-[18px] text-ink">
                          {formatCurrency(option.effective_cost)}
                        </span>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-ink-60 transition group-open:rotate-180">
                          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                        </svg>
                      </div>
                    </summary>

                    <div className="mt-4 grid gap-4 text-[13px] text-ink-80 sm:grid-cols-2">
                      <div>
                        <p className="label mb-2">Flight usage</p>
                        <ul className="space-y-1">
                          {(option.usage?.flight || []).map((entry, i) => (
                            <li key={`${entry.program || 'f'}-${i}`} className="leading-relaxed">
                              · {entry.line || entry.program}
                            </li>
                          ))}
                          {(!option.usage?.flight || option.usage.flight.length === 0) && (
                            <li className="text-ink-40">— none</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <p className="label mb-2">Hotel usage</p>
                        <ul className="space-y-1">
                          {(option.usage?.hotel || []).map((entry, i) => (
                            <li key={`${entry.program || 'h'}-${i}`} className="leading-relaxed">
                              · {entry.line || entry.program}
                            </li>
                          ))}
                          {(!option.usage?.hotel || option.usage.hotel.length === 0) && (
                            <li className="text-ink-40">— none</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>

          <div className="border-t border-ink-10 pt-6 text-center">
            <p className="font-serif italic text-[18px] text-ink-80">
              You save{' '}
              <span className="not-italic text-moss">{formatCurrency(result.savings)}</span>{' '}
              versus full-cash booking.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResultsPage;

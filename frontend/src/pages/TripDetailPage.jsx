import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { trips as tripsApi } from '../services/api';
import StrategyCard from '../components/StrategyCard';
import FlightPlan from '../components/FlightPlan';
import HotelPlan from '../components/HotelPlan';
import SavingsChart from '../components/SavingsChart';
import ExplanationPanel from '../components/ExplanationPanel';
import SkeletonLoader from '../components/SkeletonLoader';

function formatDate(value) {
  try {
    const d = new Date(value);
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

export default function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    tripsApi
      .get(id)
      .then((data) => {
        if (!cancelled) setTrip(data?.trip || null);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Could not load trip.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const result = trip?.resultJson || null;

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
          <p className="label">
            Saved trip {trip ? `· ${formatDate(trip.createdAt)}` : ''}
          </p>
        </div>

        {trip && (
          <div className="flex items-center gap-3">
            <span className="font-serif text-[20px] tracking-editorial text-ink">
              {trip.fromCity}
            </span>
            <svg width="22" height="10" viewBox="0 0 22 10" fill="none" className="text-ink-40">
              <path d="M0 5h20M20 5l-4-4M20 5l-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-serif text-[20px] tracking-editorial text-ink">
              {trip.toCity}
            </span>
          </div>
        )}
      </div>

      {loading && (
        <div className="py-10"><SkeletonLoader /></div>
      )}

      {!loading && error && (
        <div className="my-10 rounded-md border border-clay/30 bg-clay-mist px-4 py-3 text-[13px] text-clay">
          {error}{' '}
          <Link to="/trips" className="underline decoration-clay/30 underline-offset-4 hover:decoration-clay">
            Back to history →
          </Link>
        </div>
      )}

      {!loading && !error && result && (
        <div className="space-y-10 py-10 animate-fadeUp">
          {Array.isArray(result.profileNotes) && result.profileNotes.length > 0 && (
            <div className="flex items-start gap-3 rounded-md border border-ochre/40 bg-ochre/[0.06] px-4 py-3 text-[13px] text-ink-80">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-[2px] text-ochre">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
                <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div className="space-y-1">
                {result.profileNotes.map((note, i) => (
                  <p key={i}>{note}</p>
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
              <p className="label hidden sm:block">As computed</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <FlightPlan steps={result.flightPlan || []} />
              <HotelPlan items={result.hotelPlan || []} />
            </div>
          </section>

          <ExplanationPanel explanation={result.explanation || 'Explanation unavailable.'} />
        </div>
      )}
    </div>
  );
}

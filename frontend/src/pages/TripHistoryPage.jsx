import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { trips as tripsApi } from '../services/api';

function formatCurrency(value, fractionDigits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: fractionDigits }).format(n)}`;
}

function formatPoints(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

function formatDate(value) {
  try {
    const d = new Date(value);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function StatBlock({ label, value, accent }) {
  return (
    <div className="surface px-5 py-5">
      <p className="label">{label}</p>
      <p className={`mt-2 num-display text-[28px] leading-none sm:text-[32px] ${
        accent === 'moss' ? 'text-moss' : accent === 'clay' ? 'text-clay' : 'text-ink'
      }`}>
        {value}
      </p>
    </div>
  );
}

export default function TripHistoryPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest'); // newest | savings | cost

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tripsApi.list({ limit: 100 });
      setItems(data?.trips || []);
      setStats(data?.stats || null);
    } catch (err) {
      setError(err?.message || 'Could not load trip history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const sorted = useMemo(() => {
    const filtered = items.filter((t) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return t.fromCity.toLowerCase().includes(q) || t.toCity.toLowerCase().includes(q);
    });
    const copy = [...filtered];
    if (sort === 'savings') copy.sort((a, b) => (b.savings || 0) - (a.savings || 0));
    else if (sort === 'cost') copy.sort((a, b) => (a.effectiveCost || 0) - (b.effectiveCost || 0));
    else copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return copy;
  }, [items, search, sort]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this trip?')) return;
    try {
      await tripsApi.remove(id);
      setItems((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert(err?.message || 'Could not delete trip.');
    }
  };

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-12 lg:px-10">
      <header className="flex flex-col gap-4 border-b border-ink-10 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label">History</p>
          <h1 className="mt-1 font-serif text-[36px] leading-tight tracking-editorial text-ink sm:text-[44px]">
            Trip ledger
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-60">
            Every optimization you've run, kept for reference.
          </p>
        </div>
        <Link to="/" className="btn-primary">
          New optimization
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-2">
            <path d="M3 7h8M11 7l-3-3M11 7l-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </header>

      {/* Stats strip */}
      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatBlock label="Trips run" value={stats ? formatPoints(stats.count) : '—'} />
        <StatBlock label="Lifetime savings" value={stats ? formatCurrency(stats.totalSavings) : '—'} accent="moss" />
        <StatBlock label="Points spent" value={stats ? formatPoints(stats.totalPointsUsed) : '—'} accent="clay" />
      </section>

      {/* Toolbar */}
      <div className="mt-10 flex flex-col gap-3 border-b border-ink-10 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-40">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by city…"
            className="input-field pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="label-strong">Sort</span>
          {[
            { id: 'newest', label: 'Newest' },
            { id: 'savings', label: 'Best savings' },
            { id: 'cost', label: 'Lowest cost' },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSort(opt.id)}
              className={`inline-flex h-8 items-center rounded-full border px-3 text-[12.5px] font-medium transition ${
                sort === opt.id
                  ? 'border-ink bg-ink text-paper'
                  : 'border-ink-10 text-ink-60 hover:border-ink-20 hover:text-ink'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-md border border-clay/30 bg-clay-mist px-4 py-3 text-[13px] text-clay">
          {error}
        </div>
      )}

      {/* Table */}
      <section className="mt-6 surface overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b border-ink-10 bg-paper-soft/50">
            <tr>
              <th className="px-4 py-3 label">Route</th>
              <th className="px-4 py-3 label">Date</th>
              <th className="px-4 py-3 text-right label">Effective cost</th>
              <th className="px-4 py-3 text-right label">Savings</th>
              <th className="px-4 py-3 text-right label">Points</th>
              <th className="w-px px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[13px] text-ink-60">Loading…</td></tr>
            )}
            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="font-serif text-[18px] italic text-ink-60">No trips yet.</p>
                  <p className="mt-2 text-[13px] text-ink-60">
                    Run your first optimization on the{' '}
                    <Link to="/" className="underline decoration-ink-20 underline-offset-4 hover:decoration-ink">home page</Link>.
                  </p>
                </td>
              </tr>
            )}
            {sorted.map((trip) => (
              <tr key={trip.id} className="border-b border-ink-10 last:border-b-0 hover:bg-paper-soft/40">
                <td className="px-4 py-3">
                  <Link to={`/trips/${trip.id}`} className="group inline-flex items-center gap-2 text-[14px] text-ink">
                    <span className="font-serif text-[16px]">{trip.fromCity}</span>
                    <svg width="16" height="8" viewBox="0 0 16 8" fill="none" className="text-ink-40">
                      <path d="M0 4h14M14 4l-3-3M14 4l-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="font-serif text-[16px]">{trip.toCity}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-[12px] text-ink-60">{formatDate(trip.createdAt)}</td>
                <td className="px-4 py-3 text-right num-display text-[16px] text-ink">{formatCurrency(trip.effectiveCost)}</td>
                <td className="px-4 py-3 text-right num-display text-[16px] text-moss">{formatCurrency(trip.savings)}</td>
                <td className="px-4 py-3 text-right font-mono text-[12.5px] text-ink-80">{formatPoints(trip.pointsUsed)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-right">
                  <Link to={`/trips/${trip.id}`} className="btn-ghost mr-1">View</Link>
                  <button
                    onClick={() => handleDelete(trip.id)}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-ink-10 px-3 text-[13px] font-medium text-clay transition hover:border-clay/40 hover:bg-clay-mist"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

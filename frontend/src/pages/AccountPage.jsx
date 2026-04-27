import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cards as cardsApi, loyalty as loyaltyApi, trips as tripsApi } from '../services/api';

function formatNumber(value, fractionDigits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: fractionDigits }).format(n);
}

function FieldLabel({ htmlFor, children, hint }) {
  return (
    <div className="mb-1 flex items-baseline justify-between">
      <label htmlFor={htmlFor} className="label-strong">{children}</label>
      {hint && <span className="font-mono text-[10px] text-ink-40">{hint}</span>}
    </div>
  );
}

const EMPTY_CARD = { name: '', earnRateSpend: '', earnRatePoints: '', pointValue: '', currentPoints: '' };
const EMPTY_PROGRAM = { name: '', programType: 'wallet', points: '', conversionRate: '' };

function CardRow({ card, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: card.name,
    earnRateSpend: card.earnRateSpend,
    earnRatePoints: card.earnRatePoints,
    pointValue: card.pointValue,
    currentPoints: card.currentPoints ?? 0,
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await onUpdate(card.id, {
        name: draft.name.trim(),
        earnRateSpend: Number(draft.earnRateSpend),
        earnRatePoints: Number(draft.earnRatePoints),
        pointValue: Number(draft.pointValue),
        currentPoints: Number(draft.currentPoints) || 0,
      });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const balance = Number(card.currentPoints) || 0;

  if (!editing) {
    return (
      <tr className="border-b border-ink-10 last:border-b-0">
        <td className="px-4 py-3 text-[14px] text-ink">{card.name}</td>
        <td className="px-4 py-3 text-right font-mono text-[12.5px] text-ink-80">
          {formatNumber(card.earnRatePoints)} / ₹{formatNumber(card.earnRateSpend, 0)}
        </td>
        <td className="px-4 py-3 text-right font-mono text-[12.5px] text-ink-80">
          ₹{formatNumber(card.pointValue)}
        </td>
        <td className="px-4 py-3 text-right">
          {balance > 0 ? (
            <div className="flex flex-col items-end leading-tight">
              <span className="num-display text-[15px] text-ink">{formatNumber(balance, 0)} pts</span>
              <span className="font-mono text-[10.5px] uppercase tracking-widelabel text-moss">
                ≈ ₹{formatNumber(balance * (Number(card.pointValue) || 0), 0)}
              </span>
            </div>
          ) : (
            <span className="font-mono text-[11px] uppercase tracking-widelabel text-ink-40">Empty</span>
          )}
        </td>
        <td className="w-px whitespace-nowrap px-3 py-3 text-right">
          <button onClick={() => setEditing(true)} className="btn-ghost mr-1">Edit</button>
          <button
            onClick={() => onDelete(card.id)}
            className="inline-flex h-9 items-center justify-center rounded-md border border-ink-10 px-3 text-[13px] font-medium text-clay transition hover:border-clay/40 hover:bg-clay-mist"
          >
            Delete
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-ink-10 bg-paper-soft/40 last:border-b-0">
      <td className="px-4 py-3" colSpan={5}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input className="input-field" placeholder="Card name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className="input-field" type="number" step="0.01" placeholder="Spend per unit" value={draft.earnRateSpend} onChange={(e) => setDraft({ ...draft, earnRateSpend: e.target.value })} />
          <input className="input-field" type="number" step="0.01" placeholder="Points earned" value={draft.earnRatePoints} onChange={(e) => setDraft({ ...draft, earnRatePoints: e.target.value })} />
          <input className="input-field" type="number" step="0.01" placeholder="₹ per point" value={draft.pointValue} onChange={(e) => setDraft({ ...draft, pointValue: e.target.value })} />
          <input className="input-field" type="number" step="1" placeholder="Current balance (pts)" value={draft.currentPoints} onChange={(e) => setDraft({ ...draft, currentPoints: e.target.value })} />
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button onClick={() => setEditing(false)} className="btn-ghost" disabled={busy}>Cancel</button>
          <button onClick={save} className="btn-primary h-9 px-4 text-[13px]" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </td>
    </tr>
  );
}

function ProgramRow({ program, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: program.name,
    programType: program.programType,
    points: program.points,
    conversionRate: program.conversionRate,
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await onUpdate(program.id, {
        name: draft.name.trim(),
        programType: draft.programType,
        points: Number(draft.points),
        conversionRate: Number(draft.conversionRate),
      });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const typePill =
    program.programType === 'flight' ? 'pill-navy' : program.programType === 'hotel' ? 'pill-clay' : 'pill';

  if (!editing) {
    return (
      <tr className="border-b border-ink-10 last:border-b-0">
        <td className="px-4 py-3 text-[14px] text-ink">{program.name}</td>
        <td className="px-4 py-3"><span className={typePill}>{program.programType}</span></td>
        <td className="px-4 py-3 text-right font-mono text-[12.5px] text-ink-80">{formatNumber(program.points, 0)}</td>
        <td className="px-4 py-3 text-right font-mono text-[12.5px] text-ink-80">×{formatNumber(program.conversionRate)}</td>
        <td className="w-px whitespace-nowrap px-3 py-3 text-right">
          <button onClick={() => setEditing(true)} className="btn-ghost mr-1">Edit</button>
          <button
            onClick={() => onDelete(program.id)}
            className="inline-flex h-9 items-center justify-center rounded-md border border-ink-10 px-3 text-[13px] font-medium text-clay transition hover:border-clay/40 hover:bg-clay-mist"
          >
            Delete
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-ink-10 bg-paper-soft/40 last:border-b-0">
      <td className="px-4 py-3" colSpan={5}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input className="input-field" placeholder="Program name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <select className="input-field" value={draft.programType} onChange={(e) => setDraft({ ...draft, programType: e.target.value })}>
            <option value="flight">Flight</option>
            <option value="hotel">Hotel</option>
            <option value="wallet">Wallet</option>
          </select>
          <input className="input-field" type="number" step="1" placeholder="Points" value={draft.points} onChange={(e) => setDraft({ ...draft, points: e.target.value })} />
          <input className="input-field" type="number" step="0.01" placeholder="Conversion (₹/pt)" value={draft.conversionRate} onChange={(e) => setDraft({ ...draft, conversionRate: e.target.value })} />
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button onClick={() => setEditing(false)} className="btn-ghost" disabled={busy}>Cancel</button>
          <button onClick={save} className="btn-primary h-9 px-4 text-[13px]" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </td>
    </tr>
  );
}

function NewCardForm({ onCreate }) {
  const [draft, setDraft] = useState(EMPTY_CARD);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onCreate({
        name: draft.name.trim(),
        earnRateSpend: Number(draft.earnRateSpend),
        earnRatePoints: Number(draft.earnRatePoints),
        pointValue: Number(draft.pointValue),
        currentPoints: Number(draft.currentPoints) || 0,
      });
      setDraft(EMPTY_CARD);
    } catch (err) {
      setError(err?.message || 'Could not add card.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="border-t border-ink-10 bg-paper-soft/40 p-5">
      <p className="label mb-3">Add card</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <FieldLabel htmlFor="card-name">Name</FieldLabel>
          <input id="card-name" className="input-field" placeholder="HDFC Regalia" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
        </div>
        <div>
          <FieldLabel htmlFor="card-spend" hint="₹ unit">Spend per</FieldLabel>
          <input id="card-spend" type="number" step="0.01" className="input-field" placeholder="100" value={draft.earnRateSpend} onChange={(e) => setDraft({ ...draft, earnRateSpend: e.target.value })} required />
        </div>
        <div>
          <FieldLabel htmlFor="card-points" hint="pts">Points earned</FieldLabel>
          <input id="card-points" type="number" step="0.01" className="input-field" placeholder="4" value={draft.earnRatePoints} onChange={(e) => setDraft({ ...draft, earnRatePoints: e.target.value })} required />
        </div>
        <div>
          <FieldLabel htmlFor="card-value" hint="₹/pt">Point value</FieldLabel>
          <input id="card-value" type="number" step="0.01" className="input-field" placeholder="0.5" value={draft.pointValue} onChange={(e) => setDraft({ ...draft, pointValue: e.target.value })} required />
        </div>
        <div>
          <FieldLabel htmlFor="card-balance" hint="Optional">Current balance</FieldLabel>
          <input id="card-balance" type="number" step="1" min="0" className="input-field" placeholder="0" value={draft.currentPoints} onChange={(e) => setDraft({ ...draft, currentPoints: e.target.value })} />
        </div>
      </div>
      <p className="mt-2 text-[11.5px] text-ink-60">
        Current balance is the reward points already accumulated on this card. We'll redeem them against your trip alongside your loyalty programs.
      </p>
      {error && <p className="mt-3 text-[12.5px] text-clay">{error}</p>}
      <div className="mt-4 flex justify-end">
        <button type="submit" className="btn-primary h-9 px-4 text-[13px]" disabled={busy}>{busy ? 'Adding…' : 'Add card'}</button>
      </div>
    </form>
  );
}

function NewProgramForm({ onCreate }) {
  const [draft, setDraft] = useState(EMPTY_PROGRAM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await onCreate({
        name: draft.name.trim(),
        programType: draft.programType,
        points: Number(draft.points),
        conversionRate: Number(draft.conversionRate),
      });
      setDraft(EMPTY_PROGRAM);
    } catch (err) {
      setError(err?.message || 'Could not add program.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="border-t border-ink-10 bg-paper-soft/40 p-5">
      <p className="label mb-3">Add loyalty program</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <FieldLabel htmlFor="prog-name">Name</FieldLabel>
          <input id="prog-name" className="input-field" placeholder="Vistara Club" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
        </div>
        <div>
          <FieldLabel htmlFor="prog-type">Type</FieldLabel>
          <select id="prog-type" className="input-field" value={draft.programType} onChange={(e) => setDraft({ ...draft, programType: e.target.value })}>
            <option value="flight">Flight</option>
            <option value="hotel">Hotel</option>
            <option value="wallet">Wallet</option>
          </select>
        </div>
        <div>
          <FieldLabel htmlFor="prog-points" hint="balance">Points</FieldLabel>
          <input id="prog-points" type="number" step="1" className="input-field" placeholder="6000" value={draft.points} onChange={(e) => setDraft({ ...draft, points: e.target.value })} required />
        </div>
        <div>
          <FieldLabel htmlFor="prog-rate" hint="₹/pt">Conversion</FieldLabel>
          <input id="prog-rate" type="number" step="0.01" className="input-field" placeholder="0.7" value={draft.conversionRate} onChange={(e) => setDraft({ ...draft, conversionRate: e.target.value })} required />
        </div>
      </div>
      {error && <p className="mt-3 text-[12.5px] text-clay">{error}</p>}
      <div className="mt-4 flex justify-end">
        <button type="submit" className="btn-primary h-9 px-4 text-[13px]" disabled={busy}>{busy ? 'Adding…' : 'Add program'}</button>
      </div>
    </form>
  );
}

function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '₹0';
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;
}

function formatPoints(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
}

function shortDate(value) {
  try {
    const d = new Date(value);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch {
    return '—';
  }
}

export default function AccountPage() {
  const { user, logout } = useAuth();
  const [cards, setCards] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [recentTrips, setRecentTrips] = useState([]);
  const [tripStats, setTripStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, p, t] = await Promise.all([
        cardsApi.list(),
        loyaltyApi.list(),
        tripsApi.list({ limit: 5 }).catch(() => null),
      ]);
      setCards(c?.cards || []);
      setPrograms(p?.programs || []);
      setRecentTrips(t?.trips || []);
      setTripStats(t?.stats || null);
    } catch (err) {
      setError(err?.message || 'Could not load your wallet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const createCard = async (body) => {
    const { card } = await cardsApi.create(body);
    setCards((prev) => [...prev, card]);
  };
  const updateCard = async (id, body) => {
    const { card } = await cardsApi.update(id, body);
    setCards((prev) => prev.map((c) => (c.id === id ? card : c)));
  };
  const deleteCard = async (id) => {
    if (!confirm('Delete this card?')) return;
    await cardsApi.remove(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const createProgram = async (body) => {
    const { program } = await loyaltyApi.create(body);
    setPrograms((prev) => [...prev, program]);
  };
  const updateProgram = async (id, body) => {
    const { program } = await loyaltyApi.update(id, body);
    setPrograms((prev) => prev.map((p) => (p.id === id ? program : p)));
  };
  const deleteProgram = async (id) => {
    if (!confirm('Delete this program?')) return;
    await loyaltyApi.remove(id);
    setPrograms((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="mx-auto max-w-[1180px] px-6 py-12 lg:px-10">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-ink-10 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label">Account</p>
          <h1 className="mt-1 font-serif text-[36px] leading-tight tracking-editorial text-ink sm:text-[44px]">
            {user?.name || user?.email}
          </h1>
          <p className="mt-1.5 text-[13px] text-ink-60">{user?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={logout} className="btn-ghost">Sign out</button>
        </div>
      </header>

      {error && (
        <div className="mt-6 rounded-md border border-clay/30 bg-clay-mist px-4 py-3 text-[13px] text-clay">
          {error}
        </div>
      )}

      {/* Dashboard widget — at-a-glance trip activity */}
      <section className="mt-10 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-5">
          <div className="surface-soft p-6">
            <p className="label">Activity</p>
            <h3 className="mt-1 font-serif text-[22px] tracking-editorial text-ink">At a glance</h3>

            <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-ink-10 pt-5">
              <div>
                <dt className="label">Trips</dt>
                <dd className="mt-1 num-display text-[26px] text-ink">{tripStats ? formatPoints(tripStats.count) : '—'}</dd>
              </div>
              <div>
                <dt className="label">Saved</dt>
                <dd className="mt-1 num-display text-[26px] text-moss">{tripStats ? formatCurrency(tripStats.totalSavings) : '—'}</dd>
              </div>
              <div>
                <dt className="label">Pts spent</dt>
                <dd className="mt-1 num-display text-[26px] text-clay">{tripStats ? formatPoints(tripStats.totalPointsUsed) : '—'}</dd>
              </div>
            </dl>

            <Link to="/trips" className="mt-5 inline-flex items-center text-[13px] font-medium text-ink underline decoration-ink-20 underline-offset-4 hover:decoration-ink">
              Open trip ledger →
            </Link>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7">
          <div className="surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-10 bg-paper-soft/50 px-5 py-3">
              <p className="label">Recent trips</p>
              <Link to="/trips" className="font-mono text-[10.5px] uppercase tracking-widelabel text-ink-60 hover:text-ink">All →</Link>
            </div>
            {recentTrips.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-ink-60">
                No trips yet. <Link to="/" className="underline decoration-ink-20 underline-offset-4 hover:decoration-ink">Run your first optimization →</Link>
              </p>
            ) : (
              <ul className="divide-y divide-ink-10">
                {recentTrips.map((t) => (
                  <li key={t.id}>
                    <Link to={`/trips/${t.id}`} className="flex items-center justify-between gap-4 px-5 py-3 transition hover:bg-paper-soft/40">
                      <div className="flex items-center gap-2 text-[14px]">
                        <span className="font-serif text-ink">{t.fromCity}</span>
                        <svg width="14" height="8" viewBox="0 0 14 8" fill="none" className="text-ink-40">
                          <path d="M0 4h12M12 4l-3-3M12 4l-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="font-serif text-ink">{t.toCity}</span>
                      </div>
                      <div className="flex items-center gap-5">
                        <span className="num-display text-[14px] text-moss">{formatCurrency(t.savings)}</span>
                        <span className="font-mono text-[11px] uppercase tracking-widelabel text-ink-40">{shortDate(t.createdAt)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Cards section */}
      <section className="mt-12">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <p className="label">01</p>
            <h2 className="mt-1 font-serif text-[24px] text-ink">Cards</h2>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-widelabel text-ink-40">{cards.length} on file</p>
        </div>

        <div className="surface overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b border-ink-10 bg-paper-soft/50">
              <tr>
                <th className="px-4 py-3 label">Card</th>
                <th className="px-4 py-3 text-right label">Earn rate</th>
                <th className="px-4 py-3 text-right label">Point value</th>
                <th className="px-4 py-3 text-right label">Balance</th>
                <th className="w-px px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-[13px] text-ink-60">Loading…</td></tr>
              )}
              {!loading && cards.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-[13px] text-ink-60">No cards yet — add your first below.</td></tr>
              )}
              {cards.map((card) => (
                <CardRow key={card.id} card={card} onUpdate={updateCard} onDelete={deleteCard} />
              ))}
            </tbody>
          </table>
          <NewCardForm onCreate={createCard} />
        </div>
      </section>

      {/* Loyalty programs section */}
      <section className="mt-12">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <p className="label">02</p>
            <h2 className="mt-1 font-serif text-[24px] text-ink">Loyalty programs</h2>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-widelabel text-ink-40">{programs.length} on file</p>
        </div>

        <div className="surface overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b border-ink-10 bg-paper-soft/50">
              <tr>
                <th className="px-4 py-3 label">Program</th>
                <th className="px-4 py-3 label">Type</th>
                <th className="px-4 py-3 text-right label">Points</th>
                <th className="px-4 py-3 text-right label">Conversion</th>
                <th className="w-px px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-[13px] text-ink-60">Loading…</td></tr>
              )}
              {!loading && programs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-[13px] text-ink-60">No programs yet — add one below.</td></tr>
              )}
              {programs.map((program) => (
                <ProgramRow key={program.id} program={program} onUpdate={updateProgram} onDelete={deleteProgram} />
              ))}
            </tbody>
          </table>
          <NewProgramForm onCreate={createProgram} />
        </div>
      </section>
    </div>
  );
}

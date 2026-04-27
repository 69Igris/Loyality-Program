import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MagneticButton from './MagneticButton';

const CITIES = ['Delhi', 'Mumbai', 'Bangalore', 'Goa', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune'];

const SAMPLE_PROFILE = {
  cards: [
    { name: 'HDFC Regalia', earn_rate_spend: 100, earn_rate_points: 4, point_value: 0.5 },
    { name: 'Axis Atlas', earn_rate_spend: 100, earn_rate_points: 5, point_value: 0.6 },
  ],
  loyalty_programs: [
    { name: 'MakeMyTrip Wallet', points: 3000, conversion_rate: 1.0, type: 'wallet' },
    { name: 'Vistara Club', points: 6000, conversion_rate: 0.7, type: 'flight' },
    { name: 'Marriott Bonvoy', points: 12000, conversion_rate: 0.4, type: 'hotel' },
  ],
};

function FieldLabel({ children, htmlFor, hint }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <label htmlFor={htmlFor} className="label-strong">{children}</label>
      {hint && <span className="font-mono text-[10px] text-ink-40">{hint}</span>}
    </div>
  );
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-60">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function UploadCard() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const fileInputRef = useRef(null);

  const [trip, setTrip] = useState({ from: '', to: '' });
  // Profile source: 'saved' | 'upload' | 'sample'
  const [source, setSource] = useState(isAuthenticated ? 'saved' : 'upload');
  const [userData, setUserData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Whenever auth state flips, reset the chosen source sensibly.
  React.useEffect(() => {
    if (isAuthenticated) setSource('saved');
    else if (source === 'saved') setSource('upload');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const parseUserDataFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result || '{}');
        const hasCards = Array.isArray(json.cards);
        const hasPrograms = Array.isArray(json.loyalty_programs);
        if (!hasCards && !hasPrograms) {
          throw new Error('Invalid JSON shape');
        }
        // Normalize: missing arrays default to []. Either side may be empty.
        const normalized = {
          cards: hasCards ? json.cards : [],
          loyalty_programs: hasPrograms ? json.loyalty_programs : [],
        };
        if (normalized.cards.length === 0 && normalized.loyalty_programs.length === 0) {
          throw new Error('Profile has no cards and no loyalty programs.');
        }
        setUserData(normalized);
        setFileName(file.name);
        setError('');
      } catch (err) {
        setUserData(null);
        setFileName('');
        setError(
          err?.message?.startsWith('Profile has no')
            ? err.message + ' Add at least one card or one loyalty program.'
            : 'Invalid JSON. Expected { cards: [...] } and/or { loyalty_programs: [...] }.',
        );
      }
    };
    reader.readAsText(file);
  };

  const useSample = () => {
    setUserData(SAMPLE_PROFILE);
    setFileName('sample-profile.json');
    setError('');
    setSource('sample');
  };

  const clearFile = () => {
    setUserData(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!trip.from.trim() || !trip.to.trim()) {
      setError('Select both an origin and a destination.');
      return;
    }
    if (trip.from === trip.to) {
      setError('Origin and destination cannot be the same.');
      return;
    }
    if (source !== 'saved' && !userData) {
      setError('Upload a profile, use the sample, or sign in to use your saved one.');
      return;
    }

    navigate('/results', {
      state: {
        trip: { from: trip.from.trim(), to: trip.to.trim() },
        // omit userData → backend will hydrate from saved profile (when authed)
        userData: source === 'saved' ? null : userData,
      },
    });
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    parseUserDataFile(event.dataTransfer.files?.[0]);
  };

  const programCount = userData
    ? `${userData.cards?.length ?? 0} card${userData.cards?.length === 1 ? '' : 's'} · ${userData.loyalty_programs?.length ?? 0} program${userData.loyalty_programs?.length === 1 ? '' : 's'}`
    : null;

  const SourceTab = ({ value, label, available = true }) => (
    <button
      type="button"
      disabled={!available}
      onClick={() => available && setSource(value)}
      className={`relative flex-1 px-3 py-2 text-[12.5px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        source === value ? 'text-ink' : 'text-ink-60 hover:text-ink'
      }`}
    >
      {label}
      {source === value && <span className="absolute -bottom-px left-0 right-0 h-px bg-ink" />}
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="surface flex h-full flex-col p-7 shadow-page sm:p-8">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="label">Form 01</p>
          <h2 className="mt-1 font-serif text-[26px] leading-tight text-ink sm:text-[28px]">
            Plan a single trip
          </h2>
        </div>
        <span className="pill">
          <span className="h-1 w-1 rounded-full bg-clay" />
          Draft
        </span>
      </div>

      {/* Itinerary */}
      <div className="mt-7">
        <p className="label-strong mb-3">Itinerary</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <div>
            <FieldLabel htmlFor="from">From</FieldLabel>
            <div className="relative">
              <select
                id="from"
                className="input-field pr-9"
                value={trip.from}
                onChange={(e) => setTrip((prev) => ({ ...prev, from: e.target.value }))}
              >
                <option value="" disabled>Select origin</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown />
            </div>
          </div>

          <div className="hidden h-11 items-center justify-center text-ink-40 sm:flex">
            <svg width="22" height="14" viewBox="0 0 22 14" fill="none" aria-hidden="true">
              <path d="M0 7H20M20 7L14 1M20 7L14 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div>
            <FieldLabel htmlFor="to">To</FieldLabel>
            <div className="relative">
              <select
                id="to"
                className="input-field pr-9"
                value={trip.to}
                onChange={(e) => setTrip((prev) => ({ ...prev, to: e.target.value }))}
              >
                <option value="" disabled>Select destination</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown />
            </div>
          </div>
        </div>
      </div>

      {/* Profile section with tabs */}
      <div className="mt-7">
        <p className="label-strong mb-3">Wallet profile</p>

        <div className="surface-soft overflow-hidden">
          <div className="flex border-b border-ink-10">
            <SourceTab value="saved" label={isAuthenticated ? `Saved · ${user?.email?.split('@')[0]}` : 'Saved (sign in)'} available={isAuthenticated} />
            <SourceTab value="upload" label="Upload JSON" />
            <SourceTab value="sample" label="Sample" />
          </div>

          {source === 'saved' && (
            <div className="px-4 py-5 sm:px-5">
              {isAuthenticated ? (
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md border border-ink-10 bg-paper-card">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7.5l3 3 5-6" stroke="#2E5A3F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-[14px] text-ink">Use the cards and programs in your account.</p>
                    <p className="mt-1 text-[12.5px] text-ink-60">
                      The optimizer pulls them on the server.{' '}
                      <Link to="/account" className="underline decoration-ink-20 underline-offset-4 hover:decoration-ink">
                        Manage in your account →
                      </Link>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <p className="text-[13.5px] text-ink-80">
                    <Link to="/login" className="font-medium text-ink underline decoration-ink-20 underline-offset-4 hover:decoration-ink">
                      Sign in
                    </Link>{' '}
                    to reuse a saved profile across devices, or create one in{' '}
                    <Link to="/signup" className="font-medium text-ink underline decoration-ink-20 underline-offset-4 hover:decoration-ink">
                      a new account
                    </Link>.
                  </p>
                </div>
              )}
            </div>
          )}

          {source === 'upload' && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
              onDrop={handleDrop}
              className={`group relative cursor-pointer transition ${dragActive ? 'bg-navy/[0.03]' : 'hover:bg-paper-card/40'}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => parseUserDataFile(e.target.files?.[0])}
              />
              {userData ? (
                <div className="flex items-center justify-between gap-4 px-4 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ink-10 bg-paper-card">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7.5l3 3 5-6" stroke="#2E5A3F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-ink">{fileName}</p>
                      <p className="font-mono text-[11px] uppercase tracking-widelabel text-ink-60">{programCount}</p>
                    </div>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); clearFile(); }} className="text-[12px] font-medium text-ink-60 underline decoration-ink-20 underline-offset-4 hover:text-ink hover:decoration-ink">
                    Replace
                  </button>
                </div>
              ) : (
                <div className="px-4 py-6 text-center sm:py-7">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="mx-auto text-ink-60" aria-hidden="true">
                    <path d="M11 3v11M11 3L7 7M11 3l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 15v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  <p className="mt-3 text-[14px] text-ink">
                    Drop your profile JSON, or{' '}
                    <span className="underline decoration-ink-20 underline-offset-4">browse</span>
                  </p>
                  <p className="mt-1 text-[12px] text-ink-60">Expected: cards[] + loyalty_programs[]</p>
                </div>
              )}
            </div>
          )}

          {source === 'sample' && (
            <div className="px-4 py-5 sm:px-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-ink-10 bg-paper-card">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7.5l3 3 5-6" stroke="#2E5A3F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="flex-1">
                  <p className="text-[14px] text-ink">Use a sample profile to see the optimizer work end-to-end.</p>
                  <p className="mt-1 text-[12.5px] text-ink-60">2 cards · 3 programs</p>
                </div>
                <button type="button" onClick={useSample} className="btn-ghost">Load</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 flex items-start gap-2 rounded-md border border-clay/30 bg-clay-mist px-3 py-2.5 text-[13px] text-clay">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-[2px] shrink-0">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
            <path d="M7 4v3.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between gap-4 border-t border-ink-10 pt-6 lg:mt-auto">
        <p className="text-[12px] text-ink-60">
          Press <kbd className="rounded border border-ink-10 bg-paper-soft px-1.5 py-0.5 font-mono text-[11px] text-ink">⏎</kbd>{' '}
          or click run to compute.
        </p>
        <MagneticButton type="submit" className="btn-primary">
          Compute strategy
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-2">
            <path d="M3 7h8M11 7l-3-3M11 7l-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </MagneticButton>
      </div>
    </form>
  );
}

export default UploadCard;

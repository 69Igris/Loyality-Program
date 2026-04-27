import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function initialsFor(user) {
  if (!user) return '··';
  const source = (user.name || user.email || '').trim();
  if (!source) return '··';
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default function UserMenu() {
  const { user, isAuthenticated, bootstrapping, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  if (bootstrapping) {
    return <span className="font-mono text-[10px] uppercase tracking-widelabel text-ink-40">…</span>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/login" className="btn-ghost">Sign in</Link>
        <Link
          to="/signup"
          className="hidden h-9 items-center justify-center rounded-md bg-ink px-4 text-[13px] font-medium text-paper transition hover:bg-navy-deep sm:inline-flex"
        >
          Open account
        </Link>
      </div>
    );
  }

  const initials = initialsFor(user);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-2.5 rounded-full border border-ink-10 bg-paper-card py-1 pl-1 pr-3 transition hover:border-ink-20"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-paper">
          {initials}
        </span>
        <span className="hidden text-[13px] font-medium text-ink sm:inline">
          {user?.name || user?.email?.split('@')[0]}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-ink-60">
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-60 origin-top-right rounded-md border border-ink-10 bg-paper-card shadow-page animate-fadeUp">
          <div className="border-b border-ink-10 px-4 py-3">
            <p className="text-[13px] font-medium text-ink">{user?.name || 'Signed in'}</p>
            <p className="truncate text-[12px] text-ink-60">{user?.email}</p>
          </div>
          <div className="py-1">
            <Link
              to="/account"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-[13px] text-ink hover:bg-paper-soft"
            >
              Account & wallet
            </Link>
            <Link
              to="/trips"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-[13px] text-ink hover:bg-paper-soft"
            >
              Trip history
            </Link>
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-[13px] text-ink hover:bg-paper-soft"
            >
              New optimization
            </Link>
          </div>
          <div className="border-t border-ink-10 py-1">
            <button
              onClick={() => { setOpen(false); logout(); navigate('/'); }}
              className="block w-full px-4 py-2 text-left text-[13px] text-clay hover:bg-clay-mist"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

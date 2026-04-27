import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function FieldLabel({ htmlFor, children, hint }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between">
      <label htmlFor={htmlFor} className="label-strong">{children}</label>
      {hint && <span className="font-mono text-[10px] text-ink-40">{hint}</span>}
    </div>
  );
}

/** mode = 'login' | 'signup' */
function AuthForm({ mode = 'login' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isSignup = mode === 'signup';
  const heading = isSignup ? 'Open an account' : 'Sign in';
  const subhead = isSignup
    ? 'Save your cards, programs and trip history. Free, no credit card.'
    : 'Welcome back. Pick up where you left off.';
  const cta = isSignup ? 'Create account' : 'Sign in';
  const altLink = isSignup ? '/login' : '/signup';
  const altCopy = isSignup ? 'Already have an account?' : 'New to Ledger?';
  const altLabel = isSignup ? 'Sign in instead →' : 'Open an account →';

  const redirectTo = location.state?.from || '/';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isSignup) {
        await signup({ email, password, name: name.trim() || undefined });
      } else {
        await login({ email, password });
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err?.message || 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1180px] grid-cols-12 gap-x-8 gap-y-12 px-6 py-14 sm:py-20 lg:grid lg:px-10">
      <aside className="col-span-12 lg:col-span-5">
        <p className="label-strong mb-6 flex items-center gap-3">
          <span className="inline-block h-px w-8 bg-ink" />
          {isSignup ? 'New account' : 'Returning'}
        </p>
        <h1 className="font-serif text-[44px] leading-[1.05] tracking-editorial text-ink sm:text-[56px]">
          {isSignup ? (
            <>
              Keep score of your{' '}
              <em className="italic text-clay">points.</em>
            </>
          ) : (
            <>
              Welcome back to{' '}
              <em className="italic text-clay">Ledger.</em>
            </>
          )}
        </h1>
        <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-80">
          {subhead}
        </p>

        <ul className="mt-8 space-y-3 text-[13px] text-ink-60">
          <li className="flex items-center gap-3">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7.5l3 3 5-6" stroke="#2E5A3F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Saved cards & programs across devices
          </li>
          <li className="flex items-center gap-3">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7.5l3 3 5-6" stroke="#2E5A3F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Trip history and reusable strategies
          </li>
          <li className="flex items-center gap-3">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7.5l3 3 5-6" stroke="#2E5A3F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            We never store card numbers or PANs
          </li>
        </ul>
      </aside>

      <section className="col-span-12 mt-10 lg:col-span-7 lg:mt-0">
        <form onSubmit={handleSubmit} className="surface mx-auto max-w-md p-7 shadow-page sm:p-8">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="label">Form 02</p>
              <h2 className="mt-1 font-serif text-[26px] leading-tight text-ink sm:text-[28px]">{heading}</h2>
            </div>
            <span className="pill">
              <span className="h-1 w-1 rounded-full bg-moss" />
              Secure
            </span>
          </div>

          <div className="mt-7 space-y-5">
            {isSignup && (
              <div>
                <FieldLabel htmlFor="name" hint="Optional">Name</FieldLabel>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="John Doe"
                />
              </div>
            )}

            <div>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <input
                id="email"
                type="email"
                inputMode="email"
                required
                autoComplete={isSignup ? 'email' : 'username'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@domain.com"
              />
            </div>

            <div>
              <FieldLabel htmlFor="password" hint={isSignup ? 'Min 8 characters' : null}>Password</FieldLabel>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-16"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-widelabel text-ink-60 transition hover:text-ink"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-5 flex items-start gap-2 rounded-md border border-clay/30 bg-clay-mist px-3 py-2.5 text-[13px] text-clay">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-[2px] shrink-0">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
                <path d="M7 4v3.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary mt-7 w-full">
            {submitting ? 'Working…' : cta}
            {!submitting && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-2">
                <path d="M3 7h8M11 7l-3-3M11 7l-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          <p className="mt-6 border-t border-ink-10 pt-5 text-center text-[13px] text-ink-60">
            {altCopy}{' '}
            <Link to={altLink} className="font-medium text-ink underline decoration-ink-20 underline-offset-4 hover:decoration-ink">
              {altLabel}
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}

export default AuthForm;

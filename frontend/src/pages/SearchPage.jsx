import React from 'react';
import { Link } from 'react-router-dom';
import UploadCard from '../components/UploadCard';
import { useAuth } from '../contexts/AuthContext';

const SUPPORTED_PROGRAMS = [
  { name: 'Air India Maharaja Club', kind: 'Flight' },
  { name: 'Vistara Club', kind: 'Flight' },
  { name: 'IndiGo BluChip', kind: 'Flight' },
  { name: 'Marriott Bonvoy', kind: 'Hotel' },
  { name: 'Hilton Honors', kind: 'Hotel' },
  { name: 'IHG One Rewards', kind: 'Hotel' },
  { name: 'MakeMyTrip Wallet', kind: 'Wallet' },
  { name: 'HDFC SmartBuy', kind: 'Wallet' },
];

function BenefitTile({ title, body, accent = 'navy' }) {
  const accentBg =
    accent === 'moss' ? 'bg-moss-mist text-moss' :
    accent === 'clay' ? 'bg-clay-mist text-clay' :
    'bg-navy/5 text-navy';
  return (
    <div className="surface flex h-full flex-col p-6">
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${accentBg}`}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5l3 3 6.5-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <h3 className="mt-4 font-serif text-[20px] leading-tight text-ink">{title}</h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-60">{body}</p>
    </div>
  );
}

function SearchPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="mx-auto max-w-[1180px] px-6 lg:px-10">
      {/* Hero */}
      <section className="grid grid-cols-12 gap-x-8 gap-y-10 pb-14 pt-14 sm:pt-20">
        <div className="col-span-12 lg:col-span-8">
          <p className="label-strong mb-6 flex items-center gap-3">
            <span className="inline-block h-px w-8 bg-ink" />
            Issue №04 — Apr 2026
          </p>

          <h1 className="font-serif text-[44px] leading-[1.04] tracking-editorial text-ink sm:text-[64px]">
            Stop guessing how to spend{' '}
            <em className="italic text-clay">your points.</em>
            <br />
            Start{' '}
            <span className="ink-underline">accounting</span> for them.
          </h1>

          <p className="mt-7 max-w-xl text-[16.5px] leading-relaxed text-ink-80">
            Ledger figures out the cheapest way to take any trip — by mixing your
            cards, miles and stays so you pay less and waste fewer points. Tell
            us where you're going. We'll show you exactly what to use.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[12.5px] text-ink-60">
            <span className="inline-flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7.5l3 3 5-6" stroke="#2E5A3F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              No login required to try it
            </span>
            <span className="inline-flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7.5l3 3 5-6" stroke="#2E5A3F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Your card numbers stay on your device
            </span>
            <span className="inline-flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7.5l3 3 5-6" stroke="#2E5A3F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Free for personal use
            </span>
          </div>
        </div>

        <aside className="col-span-12 lg:col-span-4">
          <div className="surface-soft p-6">
            <p className="label">Supported programs · sample</p>
            <ul className="mt-4 divide-y divide-ink-10">
              {SUPPORTED_PROGRAMS.map((program) => (
                <li key={program.name} className="flex items-center justify-between py-2.5 text-[13.5px]">
                  <span className="text-ink-80">{program.name}</span>
                  <span className={`font-mono text-[10px] uppercase tracking-widelabel ${
                    program.kind === 'Flight'
                      ? 'text-navy'
                      : program.kind === 'Hotel'
                      ? 'text-clay'
                      : 'text-ochre'
                  }`}>
                    {program.kind}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[12px] text-ink-60">
              200+ more on request. Don't see yours?{' '}
              <a href="#" onClick={(e) => e.preventDefault()} className="text-ink underline decoration-ink-20 underline-offset-2 hover:decoration-ink">
                Request a program →
              </a>
            </p>
          </div>
        </aside>
      </section>

      <hr className="border-ink-10" />

      {/* Form + benefits */}
      <section className="grid grid-cols-12 gap-x-8 gap-y-10 py-14">
        <div className="col-span-12 lg:col-span-7">
          <UploadCard />
        </div>

        <div className="col-span-12 lg:col-span-5">
          <p className="label mb-4">What you get</p>
          <h2 className="font-serif text-[28px] leading-[1.15] text-ink sm:text-[32px]">
            One number. <em className="italic text-ink-60">Your real cost.</em>
          </h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-ink-60">
            Skip spreadsheets. We cross-check your wallet against the trip and
            return a single recommended strategy with the exact split between
            points and cash.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BenefitTile
              title="Save your wallet"
              body="Cards and loyalty programs in one place. Sync once, optimize forever."
              accent="navy"
            />
            <BenefitTile
              title="See real savings"
              body="Every recommendation comes with a clear ₹-amount you'd save versus paying cash."
              accent="moss"
            />
            <BenefitTile
              title="Trip history"
              body="Every plan you generate is saved. Revisit, compare, share."
              accent="clay"
            />
            <BenefitTile
              title="No guesswork"
              body="A clear recommendation, not a bewildering matrix of options."
              accent="navy"
            />
          </div>

          {!isAuthenticated && (
            <div className="mt-6 flex items-center justify-between gap-4 rounded-md border border-ink-10 bg-paper-soft/40 px-4 py-3">
              <p className="text-[13px] text-ink-80">
                Want it across devices?{' '}
                <Link to="/signup" className="font-medium text-ink underline decoration-ink-20 underline-offset-4 hover:decoration-ink">
                  Open a free account
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default SearchPage;

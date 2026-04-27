import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import UploadCard from '../components/UploadCard';
import MorphingWord from '../components/MorphingWord';
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

function BenefitTile({ title, body, accent = 'navy', index = 0 }) {
  const accentBg =
    accent === 'moss' ? 'bg-moss-mist text-moss' :
    accent === 'clay' ? 'bg-clay-mist text-clay' :
    'bg-navy/5 text-navy';
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className="surface flex h-full flex-col p-6 transition-shadow hover:shadow-page"
    >
      <span className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${accentBg}`}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5l3 3 6.5-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <h3 className="mt-4 font-serif text-[20px] leading-tight text-ink">{title}</h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-60">{body}</p>
    </motion.div>
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
            your{' '}
            <MorphingWord
              words={['points.', 'miles.', 'wallet.', 'rewards.']}
              emphasisClassName="text-clay italic"
            />
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

      {/* Form + benefits — column heights stretch on lg so the bottom edges align */}
      <section className="grid grid-cols-12 items-stretch gap-x-8 gap-y-10 py-14">
        <div className="col-span-12 lg:col-span-7 lg:h-full">
          <UploadCard />
        </div>

        <aside className="col-span-12 flex flex-col lg:col-span-5 lg:pt-8">
          {/* Header: same size + mt rhythm as the form's heading so they sit on the same baseline */}
          <p className="label">What you get</p>
          <h2 className="mt-1 font-serif text-[26px] leading-tight tracking-editorial text-ink sm:text-[28px]">
            One number. <em className="italic text-ink-60">Your real cost.</em>
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-60">
            Skip spreadsheets. We cross-check your wallet against the trip and
            return a single recommended strategy with the exact split between
            points and cash.
          </p>

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BenefitTile
              index={0}
              title="Save your wallet"
              body="Cards and loyalty programs in one place. Sync once, optimize forever."
              accent="navy"
            />
            <BenefitTile
              index={1}
              title="See real savings"
              body="Every recommendation comes with a clear ₹-amount you'd save versus paying cash."
              accent="moss"
            />
            <BenefitTile
              index={2}
              title="Trip history"
              body="Every plan you generate is saved. Revisit, compare, share."
              accent="clay"
            />
            <BenefitTile
              index={3}
              title="No guesswork"
              body="A clear recommendation, not a bewildering matrix of options."
              accent="navy"
            />
          </div>

          {!isAuthenticated && (
            // mt-auto pins this to the bottom on desktop so it lines up with the form's bottom border
            <div className="mt-6 flex items-center justify-between gap-4 rounded-md border border-ink-10 bg-paper-soft/40 px-4 py-3 lg:mt-auto">
              <p className="text-[13px] text-ink-80">
                Want it across devices?{' '}
                <Link to="/signup" className="font-medium text-ink underline decoration-ink-20 underline-offset-4 hover:decoration-ink">
                  Open a free account
                </Link>
                .
              </p>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

export default SearchPage;

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MorphingWord from '../components/MorphingWord';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const PROGRAMS = [
  { name: 'Air India Maharaja Club', kind: 'Flight' },
  { name: 'Vistara Club', kind: 'Flight' },
  { name: 'IndiGo BluChip', kind: 'Flight' },
  { name: 'Marriott Bonvoy', kind: 'Hotel' },
  { name: 'Hilton Honors', kind: 'Hotel' },
  { name: 'IHG One Rewards', kind: 'Hotel' },
  { name: 'MakeMyTrip Wallet', kind: 'Wallet' },
  { name: 'HDFC SmartBuy', kind: 'Wallet' },
  { name: 'Amex Membership Rewards', kind: 'Wallet' },
];

const TESTIMONIALS = [
  {
    quote:
      'Booked Delhi → Bangkok using a mix of Vistara miles and Amex points I forgot I had. Saved ₹12,400 on a ticket I almost paid full price for.',
    author: 'A. Mehta',
    role: 'Frequent flyer · Bangalore',
  },
  {
    quote:
      'I used to copy redemption charts into a spreadsheet. Ledger does the same math in two seconds and it stops me from wasting expiring points.',
    author: 'P. Iyer',
    role: 'Product designer · Mumbai',
  },
  {
    quote:
      "It's the first travel tool that's actually honest. It tells me when paying cash is the better move instead of forcing a redemption.",
    author: 'R. Kapoor',
    role: 'Solo traveler · Delhi',
  },
];

const FAQS = [
  {
    q: 'Do I need to share my card numbers?',
    a: 'No. Ledger only needs the rates for each card (e.g. "4 points per ₹100 spent, ₹0.50 per point") and your loyalty point balances. Card numbers and personal IDs are never collected.',
  },
  {
    q: 'How does the optimizer decide what to spend?',
    a: 'It picks the combination of points + cash that yields the lowest effective trip cost while respecting program rules — flight points stay on flights, hotel points on stays, wallet points are flexible.',
  },
  {
    q: 'Can I use it without a loyalty program?',
    a: 'Yes. If you only have cards, Ledger figures out the best card-reward play. If you only have programs, it allocates points and pays the rest in cash. The product still works either way.',
  },
  {
    q: 'Is it free?',
    a: 'Yes — free for personal use. No credit card required to sign up, no usage caps in the current beta.',
  },
];

// ---------------------------------------------------------------------------
// Hooks + small helpers
// ---------------------------------------------------------------------------

function useCountUp(target, durationMs = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const safe = Number(target) || 0;
    if (safe === 0) {
      setV(0);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(safe * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return v;
}

function useInView(threshold = 0.4) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen || !ref.current) return undefined;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [seen, threshold]);
  return [ref, seen];
}

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
};

// ---------------------------------------------------------------------------
// Reusable bits
// ---------------------------------------------------------------------------

function PrimaryCta({ to, children }) {
  return (
    <Link
      to={to}
      className="group inline-flex h-11 items-center justify-center rounded-md bg-ink px-5 text-[13.5px] font-medium text-paper transition hover:bg-navy-deep"
    >
      {children}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-2 transition-transform group-hover:translate-x-0.5">
        <path d="M3 7h8M11 7l-3-3M11 7l-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

function SecondaryCta({ to, children }) {
  return (
    <Link
      to={to}
      className="inline-flex h-11 items-center justify-center rounded-md border border-ink-20 px-5 text-[13.5px] font-medium text-ink transition hover:border-ink hover:bg-paper-soft"
    >
      {children}
    </Link>
  );
}

function SectionLabel({ children, tone = 'brass' }) {
  const c = tone === 'brass' ? 'text-brass' : 'text-ink-60';
  return (
    <p className={`flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-widelabel ${c}`}>
      <span className={`inline-block h-px w-7 ${tone === 'brass' ? 'bg-brass' : 'bg-ink-20'}`} />
      {children}
    </p>
  );
}

// Tilts subtly toward the cursor — restrained version of a magnetic effect.
function TiltCard({ children, className = '', maxTilt = 6 }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();

  const onMove = (e) => {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    ref.current.style.setProperty('--rx', `${(-y * maxTilt).toFixed(2)}deg`);
    ref.current.style.setProperty('--ry', `${(x * maxTilt).toFixed(2)}deg`);
  };
  const onLeave = () => {
    if (!ref.current) return;
    ref.current.style.setProperty('--rx', '0deg');
    ref.current.style.setProperty('--ry', '0deg');
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`will-change-transform transition-[transform] duration-200 ease-out ${className}`}
      style={{ transform: 'perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))' }}
    >
      {children}
    </div>
  );
}

// Stat that counts up only after entering the viewport
function StatCountUp({ value, suffix = '', prefix = '', label }) {
  const [ref, seen] = useInView(0.5);
  const animated = useCountUp(seen ? value : 0);
  const display = `${prefix}${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(animated)}${suffix}`;
  return (
    <div ref={ref} className="border-t border-ink-10 pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
      <p className="font-mono text-[10px] uppercase tracking-widelabel text-ink-60">{label}</p>
      <p className="mt-2 num-display text-[34px] leading-none text-ink sm:text-[40px]">{display}</p>
    </div>
  );
}

function FaqItem({ q, a, index }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="border-b border-ink-10"
    >
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="font-serif text-[18px] tracking-editorial text-ink">{q}</span>
        <span className={`shrink-0 font-mono text-[12px] uppercase tracking-widelabel transition-colors ${open ? 'text-brass' : 'text-ink-60'}`}>
          {open ? 'Close' : 'Open'}
        </span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
      >
        <p className="pb-5 pr-12 text-[14px] leading-relaxed text-ink-60">{a}</p>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LandingPage() {
  const { isAuthenticated, bootstrapping } = useAuth();
  if (!bootstrapping && isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="mx-auto max-w-[1080px] px-6 lg:px-10">
      {/* === HERO ============================================================ */}
      <section className="grid grid-cols-12 gap-x-10 gap-y-12 pt-20 pb-24 sm:pt-28">
        <motion.div
          initial="initial"
          animate="animate"
          variants={{
            initial: {},
            animate: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
          }}
          className="col-span-12 lg:col-span-7"
        >
          <motion.div
            variants={{ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.5 }}
          >
            <SectionLabel>By invitation · Now in private beta</SectionLabel>
          </motion.div>

          <motion.h1
            variants={{ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 font-serif text-[42px] leading-[1.05] tracking-editorial text-ink sm:text-[56px]"
          >
            A quieter way to spend your{' '}
            <MorphingWord
              words={['points', 'miles', 'wallet', 'rewards']}
              emphasisClassName="text-brass italic font-serif"
            />
            .
          </motion.h1>

          <motion.p
            variants={{ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.6 }}
            className="mt-6 max-w-lg text-[16px] leading-relaxed text-ink-80"
          >
            Ledger reads your cards, miles and stays — then writes the cheapest
            possible way to take any given trip. One recommendation. The exact
            split between points and cash. No spreadsheet required.
          </motion.p>

          <motion.div
            variants={{ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.55 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <PrimaryCta to="/signup">Get started — it's free</PrimaryCta>
            <SecondaryCta to="/login">Sign in</SecondaryCta>
          </motion.div>

          <motion.p
            variants={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-5 font-mono text-[10.5px] uppercase tracking-widelabel text-ink-40"
          >
            No credit card · 60-second setup
          </motion.p>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="col-span-12 lg:col-span-5"
        >
          <TiltCard>
            <div className="surface relative overflow-hidden p-6">
              <span className="pointer-events-none absolute right-4 top-4 inline-flex h-1.5 w-1.5 rounded-full bg-brass" />
              <p className="font-mono text-[10px] uppercase tracking-widelabel text-ink-60">Specimen</p>
              <h3 className="mt-1 font-serif text-[18px] tracking-editorial text-ink">
                A trip from Delhi to Mumbai
              </h3>

              <dl className="mt-5 divide-y divide-ink-10 text-[13px]">
                <div className="flex items-baseline justify-between py-2.5">
                  <dt className="text-ink-60">Cash booking</dt>
                  <dd className="num-display text-[16px] text-ink">₹10,941</dd>
                </div>
                <div className="flex items-baseline justify-between py-2.5">
                  <dt className="text-ink-60">With Ledger</dt>
                  <dd className="num-display text-[16px] text-ink">₹6,127</dd>
                </div>
                <div className="flex items-baseline justify-between py-2.5">
                  <dt className="font-medium text-moss">You save</dt>
                  <dd className="num-display text-[20px] text-moss">₹4,814</dd>
                </div>
              </dl>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-ink-10 pt-4">
                <div>
                  <p className="font-mono text-[9.5px] uppercase tracking-widelabel text-ink-40">Points spent</p>
                  <p className="num-display mt-1 text-[18px] text-ink">3,000</p>
                </div>
                <div>
                  <p className="font-mono text-[9.5px] uppercase tracking-widelabel text-ink-40">Card rewards</p>
                  <p className="num-display mt-1 text-[18px] text-ink">₹245</p>
                </div>
              </div>
            </div>
          </TiltCard>
          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-widelabel text-ink-40">
            Sample · not your real account
          </p>
        </motion.aside>
      </section>

      {/* === STATS BAND ====================================================== */}
      <section className="border-t border-ink-10 py-14">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <StatCountUp value={4814} prefix="₹" label="Saved on a sample trip" />
          <StatCountUp value={200} suffix="+" label="Programs supported" />
          <StatCountUp value={2} suffix="s" label="Average compute time" />
        </div>
        <p className="mt-6 max-w-md text-[12.5px] text-ink-60">
          Honest math. We compute the cash baseline alongside your strategy
          so the savings figure is auditable, not a marketing number.
        </p>
      </section>

      {/* === HOW IT WORKS ==================================================== */}
      <section className="border-t border-ink-10 py-20">
        <div className="grid grid-cols-12 gap-x-10 gap-y-8">
          <motion.div {...fadeUp} className="col-span-12 lg:col-span-4">
            <SectionLabel>How it works</SectionLabel>
            <h2 className="mt-3 font-serif text-[28px] leading-[1.15] tracking-editorial text-ink sm:text-[32px]">
              Three steps. No spreadsheet.
            </h2>
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-ink-60">
              You bring the wallet. We do the math. Open an account to begin.
            </p>
          </motion.div>

          <div className="col-span-12 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-3 lg:col-span-8">
            {[
              {
                title: 'Save your wallet, once',
                body: 'Add the cards and loyalty programs you actually use. Update balances when they change.',
              },
              {
                title: 'Tell us the trip',
                body: "Pick origin and destination. Ledger reads the route's pricing context.",
              },
              {
                title: 'Get one recommendation',
                body: 'A single, clear strategy with the exact split between points and cash. Saved for later.',
              },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="border-t border-ink-10 pt-6"
              >
                <p className="font-mono text-[10.5px] uppercase tracking-widelabel text-brass">
                  Step · {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-2 font-serif text-[22px] leading-tight tracking-editorial text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-60">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* === WHY LEDGER ====================================================== */}
      <section className="border-t border-ink-10 py-20">
        <div className="grid grid-cols-12 gap-x-10 gap-y-10">
          <motion.div {...fadeUp} className="col-span-12 lg:col-span-5">
            <SectionLabel>Why Ledger</SectionLabel>
            <h2 className="mt-3 font-serif text-[30px] leading-[1.15] tracking-editorial text-ink sm:text-[36px]">
              The travel optimizer for people who actually keep score.
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-ink-80">
              Most points apps tell you what you have. Ledger tells you what
              to do with it — and is honest enough to say "pay cash" when
              that's the better move.
            </p>
          </motion.div>

          <div className="col-span-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-7">
            {[
              {
                k: 'Honest math',
                v: 'We never spend more points than the price warrants. Each redemption is bounded.',
              },
              {
                k: 'Domain-correct',
                v: 'Flight points stay on flights. Hotel points stay on stays. Wallet points are flexible.',
              },
              {
                k: 'Saved automatically',
                v: 'Every plan you generate is added to your trip history for revisit and comparison.',
              },
              {
                k: 'Privacy-first',
                v: "We don't store card numbers, PANs, or any personally identifying card data.",
              },
            ].map((tile, i) => (
              <motion.div
                key={tile.k}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="border-l border-ink-10 pl-5"
              >
                <p className="font-mono text-[10px] uppercase tracking-widelabel text-brass">{tile.k}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-80">{tile.v}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* === TESTIMONIALS ==================================================== */}
      <section className="border-t border-ink-10 py-20">
        <motion.div {...fadeUp}>
          <SectionLabel>Field reports</SectionLabel>
          <h2 className="mt-3 max-w-2xl font-serif text-[28px] leading-[1.2] tracking-editorial text-ink sm:text-[32px]">
            What people who travel a lot are saying.
          </h2>
        </motion.div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.figure
              key={t.author}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="surface flex flex-col p-6"
            >
              <span className="font-serif text-[42px] leading-none text-brass" aria-hidden="true">"</span>
              <blockquote className="mt-2 flex-1 font-serif text-[18px] leading-[1.45] tracking-editorial text-ink-80">
                {t.quote}
              </blockquote>
              <figcaption className="mt-6 border-t border-ink-10 pt-4">
                <p className="font-medium text-[13px] text-ink">{t.author}</p>
                <p className="font-mono text-[10.5px] uppercase tracking-widelabel text-ink-60">{t.role}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </section>

      {/* === PROGRAMS STRIP ================================================== */}
      <section className="border-t border-ink-10 py-16">
        <motion.div {...fadeUp} className="flex items-baseline justify-between border-b border-ink pb-3">
          <p className="font-mono text-[10.5px] uppercase tracking-widelabel text-ink">
            Programs in catalogue
          </p>
          <p className="font-mono text-[10.5px] tabular-nums text-ink-60">200+ supported</p>
        </motion.div>
        <ul className="mt-2 grid grid-cols-1 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {PROGRAMS.map((p, i) => (
            <motion.li
              key={p.name}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.4, delay: i * 0.04, ease: 'easeOut' }}
              className="flex items-baseline justify-between border-b border-dashed border-ink-10 py-3 text-[13.5px]"
            >
              <span className="text-ink-80">{p.name}</span>
              <span className={`font-mono text-[10px] uppercase tracking-widelabel ${
                p.kind === 'Flight' ? 'text-navy' : p.kind === 'Hotel' ? 'text-clay' : 'text-brass'
              }`}>
                {p.kind}
              </span>
            </motion.li>
          ))}
        </ul>
      </section>

      {/* === FAQ ============================================================= */}
      <section className="border-t border-ink-10 py-20">
        <div className="grid grid-cols-12 gap-x-10 gap-y-8">
          <motion.div {...fadeUp} className="col-span-12 lg:col-span-4">
            <SectionLabel>Common questions</SectionLabel>
            <h2 className="mt-3 font-serif text-[28px] leading-[1.15] tracking-editorial text-ink sm:text-[32px]">
              Before you sign up.
            </h2>
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-ink-60">
              Anything else?{' '}
              <a href="#" onClick={(e) => e.preventDefault()} className="text-ink underline decoration-ink-20 underline-offset-4 hover:decoration-ink">
                Write to us →
              </a>
            </p>
          </motion.div>
          <div className="col-span-12 lg:col-span-8">
            <div className="border-t border-ink-10">
              {FAQS.map((f, i) => (
                <FaqItem key={f.q} q={f.q} a={f.a} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* === CLOSING CTA ===================================================== */}
      <section className="border-t border-ink-10 py-20">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-12 items-end gap-x-10 gap-y-8"
        >
          <div className="col-span-12 lg:col-span-8">
            <SectionLabel>Begin</SectionLabel>
            <h2 className="mt-3 font-serif text-[32px] leading-[1.1] tracking-editorial text-ink sm:text-[44px]">
              Open an account. <em className="italic text-ink-60">Take the first trip.</em>
            </h2>
            <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-ink-60">
              Free for personal use. Cancel anytime. We don't store card numbers.
            </p>
          </div>
          <div className="col-span-12 flex flex-wrap items-center gap-3 lg:col-span-4 lg:justify-end">
            <PrimaryCta to="/signup">Get started</PrimaryCta>
            <SecondaryCta to="/login">Sign in</SecondaryCta>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

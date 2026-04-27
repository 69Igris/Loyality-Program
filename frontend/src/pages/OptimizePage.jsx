import React from 'react';
import { Link } from 'react-router-dom';
import UploadCard from '../components/UploadCard';
import { useAuth } from '../contexts/AuthContext';

function HelperRow({ label, body }) {
  return (
    <div className="border-t border-ink-10 pt-5">
      <p className="font-mono text-[10.5px] uppercase tracking-widelabel text-brass">{label}</p>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-80">{body}</p>
    </div>
  );
}

export default function OptimizePage() {
  const { user } = useAuth();
  const greetingName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  return (
    <div className="mx-auto max-w-[1180px] px-6 lg:px-10">
      {/* Page header */}
      <header className="border-b border-ink-10 py-10">
        <div className="grid grid-cols-12 gap-x-10 gap-y-4 items-end">
          <div className="col-span-12 lg:col-span-8">
            <p className="flex items-center gap-3 font-mono text-[10.5px] uppercase tracking-widelabel text-brass">
              <span className="inline-block h-px w-7 bg-brass" />
              New optimization
            </p>
            <h1 className="mt-3 font-serif text-[36px] leading-tight tracking-editorial text-ink sm:text-[44px]">
              Hello, <em className="italic text-ink-60">{greetingName}.</em>
            </h1>
            <p className="mt-2 text-[14px] text-ink-60">
              Where are you going next?
            </p>
          </div>

          <div className="col-span-12 flex flex-wrap items-center gap-2 lg:col-span-4 lg:justify-end">
            <Link
              to="/account"
              className="inline-flex h-9 items-center rounded-md border border-ink-10 px-3 text-[12.5px] font-medium text-ink-80 transition hover:border-ink-20 hover:bg-paper-soft"
            >
              Manage wallet
            </Link>
            <Link
              to="/trips"
              className="inline-flex h-9 items-center rounded-md border border-ink-10 px-3 text-[12.5px] font-medium text-ink-80 transition hover:border-ink-20 hover:bg-paper-soft"
            >
              Trip history
            </Link>
          </div>
        </div>
      </header>

      {/* Form + sidebar */}
      <section className="grid grid-cols-12 items-stretch gap-x-10 gap-y-10 py-10">
        <div className="col-span-12 lg:col-span-7 lg:h-full">
          <UploadCard />
        </div>

        <aside className="col-span-12 flex flex-col lg:col-span-5 lg:pt-2">
          <p className="font-mono text-[10.5px] uppercase tracking-widelabel text-brass">
            A few notes
          </p>
          <h2 className="mt-2 font-serif text-[24px] leading-tight tracking-editorial text-ink">
            Get more from each computation.
          </h2>

          <div className="mt-7 space-y-6">
            <HelperRow
              label="Sources"
              body="By default we use your saved cards and programs. You can also upload a JSON profile or run against the sample data."
            />
            <HelperRow
              label="Allocation"
              body="Flight points stay on flights, hotel points on stays, wallet points are flexible — and never spent beyond what each leg is worth."
            />
            <HelperRow
              label="Saved automatically"
              body="Every result is added to your trip history. You can revisit, compare, or delete it any time."
            />
          </div>

          <div className="mt-auto pt-8 hidden lg:block">
            <p className="font-mono text-[10px] uppercase tracking-widelabel text-ink-40">
              Tip
            </p>
            <p className="mt-1 text-[13px] text-ink-60">
              Add the current points balance on each card so card-issuer rewards
              redeem against your trip too.{' '}
              <Link to="/account" className="text-ink underline decoration-ink-20 underline-offset-4 hover:decoration-ink">
                Update your wallet →
              </Link>
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

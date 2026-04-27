import React from 'react';

const ITEMS = [
  { name: 'Air India Maharaja Club', kind: 'Flight' },
  { name: 'Vistara Club', kind: 'Flight' },
  { name: 'IndiGo BluChip', kind: 'Flight' },
  { name: 'SpiceJet SpiceClub', kind: 'Flight' },
  { name: 'Marriott Bonvoy', kind: 'Hotel' },
  { name: 'Hilton Honors', kind: 'Hotel' },
  { name: 'IHG One Rewards', kind: 'Hotel' },
  { name: 'Accor Live Limitless', kind: 'Hotel' },
  { name: 'MakeMyTrip Wallet', kind: 'Wallet' },
  { name: 'HDFC SmartBuy', kind: 'Wallet' },
  { name: 'Amex Membership Rewards', kind: 'Wallet' },
  { name: 'Axis EDGE', kind: 'Wallet' },
];

function Tag({ kind }) {
  const tone =
    kind === 'Flight' ? 'text-navy' :
    kind === 'Hotel' ? 'text-clay' : 'text-ochre';
  return <span className={`font-mono text-[9.5px] uppercase tracking-widelabel ${tone}`}>{kind}</span>;
}

function Track() {
  return (
    <ul className="flex shrink-0 items-center gap-8 px-4">
      {ITEMS.map((p) => (
        <li key={p.name} className="flex items-center gap-2 text-[12.5px] text-ink-80">
          <span className="h-1 w-1 rounded-full bg-ink-20" />
          <span className="whitespace-nowrap">{p.name}</span>
          <Tag kind={p.kind} />
        </li>
      ))}
    </ul>
  );
}

export default function ProgramMarquee() {
  return (
    <div className="relative overflow-hidden border-b border-ink-10 bg-paper-soft/60">
      <div className="relative">
        <div className="marquee-track flex">
          <Track />
          <Track />
        </div>
        {/* Edge fades so items dissolve in/out instead of hard-clipping */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-paper-soft to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-paper-soft to-transparent" />
      </div>
    </div>
  );
}

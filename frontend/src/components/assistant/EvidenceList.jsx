import React from 'react';

const STATUS_COPY = {
  insufficient: 'No policy passage was relevant enough to cite. The assistant makes no policy claims for this answer.',
  unavailable: 'The policy knowledge base could not be reached. This answer is not backed by policy passages.',
};

export default function EvidenceList({ evidence, status }) {
  if ((!evidence || evidence.length === 0) && !STATUS_COPY[status]) return null;

  return (
    <section className="surface px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="label">Evidence</p>
          <h3 className="mt-1 font-serif text-[20px] text-ink">Policy references</h3>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widelabel text-ink-40">FAISS retrieval</p>
      </div>

      {STATUS_COPY[status] && evidence.length === 0 ? (
        <p className="mt-3 rounded-md border border-ochre/40 bg-ochre/[0.06] px-3 py-2 text-[12.5px] text-ink-80">
          {STATUS_COPY[status]}
        </p>
      ) : (
        <ol className="mt-3 space-y-2.5">
          {evidence.map((item) => (
            <li key={item.id} id={`evidence-${item.tag}`} className="flex gap-3">
              <span className="pill-navy h-fit shrink-0">{item.tag}</span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink">{item.title}</p>
                <p className="text-[12.5px] leading-relaxed text-ink-80">{item.text}</p>
                <p className="mt-0.5 font-mono text-[10px] text-ink-40">
                  {item.source}
                  {Number.isFinite(item.score) && ` · relevance ${item.score.toFixed(2)}`}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

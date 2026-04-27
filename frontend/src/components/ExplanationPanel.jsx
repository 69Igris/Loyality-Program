import React from 'react';

function ExplanationPanel({ explanation }) {
  return (
    <section className="grid grid-cols-12 gap-6">
      <aside className="col-span-12 lg:col-span-3">
        <p className="label">Editor's note</p>
        <p className="mt-3 text-[12.5px] leading-relaxed text-ink-60">
          A reasoning trace produced from the strategy graph. Constrained by the
          three rules: bounded redemption, domain-correct allocation, best-card top-up.
        </p>
      </aside>

      <article className="col-span-12 lg:col-span-9">
        <div className="surface relative px-7 py-7 sm:px-8 sm:py-8">
          <span className="absolute left-7 top-2 font-serif text-[64px] leading-none text-ink-10 sm:left-8" aria-hidden="true">
            “
          </span>
          <div className="relative pl-9 sm:pl-10">
            <p className="font-serif text-[20px] leading-[1.45] tracking-editorial text-ink-80 sm:text-[22px]">
              {explanation.split(/\n+/).map((line, i, arr) => (
                <React.Fragment key={i}>
                  {line.trim()}
                  {i < arr.length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>

            <div className="mt-6 flex items-center gap-3 text-[11px] text-ink-60">
              <span className="font-mono uppercase tracking-widelabel">— Strategy notes</span>
              <span className="h-px flex-1 bg-ink-10" />
              <span className="font-mono uppercase tracking-widelabel">Rev. 04.26</span>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}

export default ExplanationPanel;

import React from 'react';
import { TOOL_LABELS } from '../../utils/format';

function StatusDot({ status }) {
  if (status === 'started') {
    return <span className="mt-[5px] h-2 w-2 shrink-0 animate-pulse rounded-full bg-brass" aria-label="Running" />;
  }
  if (status === 'error') return <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-clay" aria-label="Failed" />;
  return <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-moss" aria-label="Done" />;
}

// Shows the tool calls that actually ran, live while streaming and from the
// final trace afterwards. Nothing here is simulated.
function StepList({ steps }) {
  return (
    <ol className="mt-2 space-y-1.5">
      {steps.map((step) => (
        <li key={step.id} className="flex items-start gap-2.5 text-[12.5px]">
          <StatusDot status={step.status === 'ok' ? 'ok' : step.status} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="font-medium text-ink">{TOOL_LABELS[step.tool] || step.tool}</span>
              <span className="font-mono text-[9.5px] uppercase tracking-widelabel text-ink-40">
                {step.planner === 'llm' ? 'AI chose' : 'Workflow'}
              </span>
              {Number.isFinite(step.durationMs) && <span className="font-mono text-[10px] text-ink-40">{step.durationMs}ms</span>}
            </div>
            {step.summary && <p className="text-ink-60">{step.summary}</p>}
            {step.argsReconciled && <p className="text-[11.5px] text-ochre">Arguments aligned with your request.</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function WorkflowTrace({ steps, phase, live = false }) {
  if (!live && (!steps || steps.length === 0)) return null;

  // Finished runs collapse to one line so the chat stays readable.
  if (!live) {
    const aiChosen = steps.filter((s) => s.planner === 'llm').length;
    return (
      <details className="group rounded-md border border-ink-10 bg-paper-soft/50 px-3 py-2">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
          <span className="label">
            Workflow · {steps.length} step{steps.length === 1 ? '' : 's'}
            {aiChosen > 0 && ` · ${aiChosen} chosen by AI`}
          </span>
          <svg width="10" height="10" viewBox="0 0 12 12" className="text-ink-60 transition group-open:rotate-180" aria-hidden="true">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </svg>
        </summary>
        <StepList steps={steps} />
      </details>
    );
  }

  return (
    <div className="rounded-md border border-ink-10 bg-paper-soft/50 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="label">Working</p>
        {phase && <p className="font-mono text-[10px] text-ink-60">{phase}…</p>}
      </div>
      {steps.length > 0 && <StepList steps={steps} />}
    </div>
  );
}

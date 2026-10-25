// Merge streamed 'started' and completion events into one row per tool call.
export function stepsFromEvents(events) {
  const steps = new Map();
  for (const event of events) {
    if (event.type !== 'tool') continue;
    steps.set(event.id, { ...(steps.get(event.id) || {}), ...event });
  }
  return [...steps.values()];
}

export function latestPhase(events) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i].type === 'phase') return events[i].label;
  }
  return null;
}

// Split "text [P1] more" into text and citation-tag parts for rendering.
export function splitCitations(text) {
  return `${text ?? ''}`.split(/(\[P\d+\])/g).filter(Boolean).map((part) => {
    const match = part.match(/^\[(P\d+)\]$/);
    return match ? { tag: match[1] } : { text: part };
  });
}

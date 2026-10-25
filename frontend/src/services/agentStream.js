// NDJSON stream reader for the assistant endpoint. Kept free of React and of
// fetch so it can be unit-tested with a fake reader.

/**
 * Read newline-delimited JSON from a ReadableStream reader, calling onEvent for
 * each parsed object. Returns the `result` payload. Throws on an `error` event,
 * on malformed lines, or if the stream ends without a result.
 */
export async function readAgentStream(reader, onEvent = () => {}) {
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;

  const handleLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let event;
    try {
      event = JSON.parse(trimmed);
    } catch {
      throw new Error('The assistant sent an unreadable response.');
    }
    if (event.type === 'error') throw new Error(event.error || 'The assistant failed to respond.');
    if (event.type === 'result') result = event.result;
    else onEvent(event);
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    lines.forEach(handleLine);
  }
  buffer += decoder.decode();
  handleLine(buffer);

  if (!result) throw new Error('The assistant stopped before finishing. Please try again.');
  return result;
}

export function friendlyAgentError(error) {
  if (error?.name === 'AbortError') return 'Request cancelled.';
  if (error?.status === 401) return 'Your session has expired. Please sign in again.';
  if (error?.status === 429) return error.message || 'Too many requests — please wait a minute.';
  if (error?.status === 400) return error.message || 'That message could not be processed.';
  return error?.message || 'Something went wrong. Please try again.';
}

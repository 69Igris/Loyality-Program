// Run with `npm test` (node:test; these modules have no browser/Vite dependencies).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { friendlyAgentError, readAgentStream } from './agentStream.js';
import { splitCitations, stepsFromEvents } from '../utils/agent.js';

function readerFrom(chunks) {
  const encoder = new TextEncoder();
  let i = 0;
  return {
    read: async () => (i < chunks.length ? { value: encoder.encode(chunks[i++]), done: false } : { value: undefined, done: true }),
  };
}

test('parses events split across chunks and returns the result', async () => {
  const events = [];
  const result = await readAgentStream(
    readerFrom(['{"type":"phase","label":"Und', 'erstanding"}\n{"type":"tool","id":"1","status":"started"}\n', '{"type":"result","result":{"status":"answered"}}']),
    (e) => events.push(e),
  );
  assert.deepEqual(result, { status: 'answered' });
  assert.deepEqual(events.map((e) => e.type), ['phase', 'tool']);
});

test('surfaces server error events', async () => {
  await assert.rejects(readAgentStream(readerFrom(['{"type":"error","error":"boom"}\n'])), /boom/);
});

test('fails on malformed lines and on streams that end without a result', async () => {
  await assert.rejects(readAgentStream(readerFrom(['not json\n'])), /unreadable/);
  await assert.rejects(readAgentStream(readerFrom(['{"type":"phase"}\n'])), /stopped before finishing/);
});

test('maps HTTP failures to friendly messages', () => {
  assert.match(friendlyAgentError({ status: 401 }), /sign in again/);
  assert.match(friendlyAgentError({ status: 429, message: 'Too many assistant requests.' }), /Too many/);
  assert.equal(friendlyAgentError({ name: 'AbortError' }), 'Request cancelled.');
  assert.match(friendlyAgentError(undefined), /Something went wrong/);
});

test('merges started/completed tool events into one step each', () => {
  const steps = stepsFromEvents([
    { type: 'tool', id: '1', tool: 'get_loyalty_balance', status: 'started' },
    { type: 'phase', label: 'x' },
    { type: 'tool', id: '1', tool: 'get_loyalty_balance', status: 'ok', durationMs: 4 },
  ]);
  assert.equal(steps.length, 1);
  assert.equal(steps[0].status, 'ok');
});

test('splits citation tags from text', () => {
  assert.deepEqual(splitCitations('Taxes apply [P1]. Also [P2]'), [{ text: 'Taxes apply ' }, { tag: 'P1' }, { text: '. Also ' }, { tag: 'P2' }]);
});

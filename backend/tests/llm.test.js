import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGroqClient } from '../agent/llm.js';

const ok = (message) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message }] }) });
const status = (code) => ({ ok: false, status: code, json: async () => ({}) });

function client(responses, extra = {}) {
  let i = 0;
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    const r = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return typeof r === 'function' ? r(init) : r;
  };
  return { calls, llm: createGroqClient({ apiKey: 'test', baseUrl: 'http://llm', model: 'm', timeoutMs: 100, maxTokens: 50, fetchImpl, ...extra }) };
}

test('returns null without an API key', () => {
  assert.equal(createGroqClient({ apiKey: '' }), null);
});

test('parses tool calls', async () => {
  const { llm, calls } = client([ok({ content: null, tool_calls: [{ id: 'a', function: { name: 'get_loyalty_balance', arguments: '{}' } }] })]);
  const reply = await llm.complete({ messages: [], tools: [{}] });
  assert.deepEqual(reply.toolCalls, [{ id: 'a', name: 'get_loyalty_balance', arguments: '{}' }]);
  assert.equal(calls[0].body.parallel_tool_calls, false);
});

test('retries 429/5xx with backoff, then succeeds', async () => {
  const { llm, calls } = client([status(429), status(503), ok({ content: 'hi' })]);
  const reply = await llm.complete({ messages: [] });
  assert.equal(reply.content, 'hi');
  assert.equal(calls.length, 3);
});

test('does not retry client errors and hides provider bodies', async () => {
  const { llm, calls } = client([status(400)]);
  await assert.rejects(llm.complete({ messages: [] }), (err) => err.code === 'provider_error' && !/body/.test(err.message));
  assert.equal(calls.length, 1);
});

test('times out hung requests', async () => {
  const hang = (init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  const { llm } = client([hang]);
  await assert.rejects(llm.complete({ messages: [] }), (err) => err.code === 'timeout');
});

test('rejects malformed provider output', async () => {
  const { llm } = client([{ ok: true, status: 200, json: async () => ({ choices: [] }) }]);
  await assert.rejects(llm.complete({ messages: [] }), (err) => err.code === 'invalid_output');
});

test('retries malformed tool generations (tool_use_failed) and keeps only the error code', async () => {
  const toolFail = { ok: false, status: 400, json: async () => ({ error: { code: 'tool_use_failed', message: 'secret prompt echo' } }) };
  const { llm, calls } = client([toolFail, ok({ content: 'fine' })]);
  assert.equal((await llm.complete({ messages: [] })).content, 'fine');
  assert.equal(calls.length, 2);

  const { llm: failing } = client([toolFail]);
  await assert.rejects(failing.complete({ messages: [] }), (err) => err.code === 'tool_use_failed' && !/secret/.test(err.message));
});

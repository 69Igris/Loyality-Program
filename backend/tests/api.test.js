import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import rateLimit from 'express-rate-limit';

process.env.JWT_SECRET ||= 'test-secret-that-is-long-enough-for-jwt';

const { signAuthToken } = await import('../lib/jwt.js');
const { createRequireAuth, tokenResolver } = await import('../middleware/auth.js');
const { createAgentRouter } = await import('../routes/agent.js');
const { makeAgent } = await import('./helpers.js');

const USERS = { alice: { id: 'alice', homeCity: 'Delhi' }, bob: { id: 'bob', homeCity: null } };
let server;
let baseUrl;

function buildApp({ limiter = (_req, _res, next) => next(), agent } = {}) {
  const app = express();
  app.use(express.json());
  app.use(
    '/api/agent',
    createAgentRouter({
      agent: agent ?? makeAgent().agent,
      requireAuth: createRequireAuth(tokenResolver(async (id) => USERS[id] ?? null)),
      limiter,
    }),
  );
  return app;
}

async function listen(app) {
  return new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
}

before(async () => {
  server = await listen(buildApp());
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const auth = (id) => ({ Authorization: `Bearer ${signAuthToken({ id, email: `${id}@x.test` })}` });
const post = (body, headers = {}, url = baseUrl) =>
  fetch(`${url}/api/agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

test('requires a valid token', async () => {
  assert.equal((await post({ message: 'hi' })).status, 401);
  assert.equal((await post({ message: 'hi' }, { Authorization: 'Bearer forged.token.value' })).status, 401);
  assert.equal((await post({ message: 'hi' }, auth('mallory'))).status, 401, 'token for unknown user');
});

test('validates the request body', async () => {
  const empty = await post({ message: '' }, auth('alice'));
  assert.equal(empty.status, 400);
  assert.equal((await post({ message: 'x'.repeat(1001) }, auth('alice'))).status, 400);
  assert.equal((await post({ message: 'hi', userId: 'bob' }, auth('alice'))).status, 400, 'extra keys rejected');
  assert.equal((await post({ message: 'hi', conversationId: '../../etc' }, auth('alice'))).status, 400);
});

test('returns a structured recommendation as JSON', async () => {
  const res = await post({ message: 'Best hotel redemption in Goa for 2 nights' }, auth('alice'));
  assert.equal(res.status, 200);
  const body = await res.json();
  for (const key of ['conversationId', 'message', 'recommendation', 'alternatives', 'calculations', 'evidence', 'notices', 'trace', 'followUps']) {
    assert.ok(key in body, `missing ${key}`);
  }
  assert.equal(body.readOnly, true);
  assert.ok(!JSON.stringify(body).match(/GROQ|api[_-]?key|stack/i));
});

test('streams workflow events then the result as NDJSON', async () => {
  const res = await post({ message: 'Hotel in Goa' }, { ...auth('alice'), Accept: 'application/x-ndjson' });
  assert.match(res.headers.get('content-type'), /application\/x-ndjson/);
  const events = (await res.text()).trim().split('\n').map((line) => JSON.parse(line));
  assert.ok(events.some((e) => e.type === 'phase'));
  const tools = events.filter((e) => e.type === 'tool' && e.status !== 'started');
  assert.ok(tools.length >= 3);
  const last = events.at(-1);
  assert.equal(last.type, 'result');
  assert.deepEqual(last.result.trace.map((t) => t.tool), tools.map((t) => t.tool), 'streamed steps match the trace');
});

test("one user cannot resume another user's conversation", async () => {
  const a = await (await post({ message: 'Hotel in Goa for 2 nights' }, auth('alice'))).json();
  const b = await (await post({ message: 'Why is this better?', conversationId: a.conversationId }, auth('bob'))).json();
  assert.notEqual(b.conversationId, a.conversationId);
  assert.ok(!JSON.stringify(b).includes('HDFC Regalia'));
});

test('agent failures return a safe error', async () => {
  const broken = { run: async () => { throw new Error('secret internal detail'); } };
  const s = await listen(buildApp({ agent: broken }));
  try {
    const res = await post({ message: 'Hotel in Goa' }, auth('alice'), `http://127.0.0.1:${s.address().port}`);
    assert.equal(res.status, 500);
    const text = await res.text();
    assert.ok(!text.includes('secret internal detail'));
  } finally {
    s.close();
  }
});

test('rate limits per user', async () => {
  const limiter = rateLimit({ windowMs: 60000, max: 2, keyGenerator: (req) => req.user.id, standardHeaders: true, legacyHeaders: false });
  const s = await listen(buildApp({ limiter }));
  const url = `http://127.0.0.1:${s.address().port}`;
  try {
    const statuses = [];
    for (let i = 0; i < 3; i += 1) statuses.push((await post({ message: 'hello' }, auth('alice'), url)).status);
    assert.deepEqual(statuses, [200, 200, 429]);
    assert.equal((await post({ message: 'hello' }, auth('bob'), url)).status, 200, 'other users unaffected');
  } finally {
    s.close();
  }
});

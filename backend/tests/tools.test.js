import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeTool, TOOL_NAMES, toolDefinitions, validateToolArgs } from '../agent/tools.js';
import { fakeBalances, fakeRag } from './helpers.js';

function ctx(userId = 'alice', overrides = {}) {
  const balances = fakeBalances();
  return {
    balances,
    userId,
    deps: { loadBalances: balances.load, rag: fakeRag() },
    config: { toolTimeoutMs: 500 },
    state: { balances: null, options: new Map(), searches: [], evidence: [], evidenceStatus: 'not_requested' },
    slots: {},
    ...overrides,
  };
}

test('allowlist is exactly the four documented tools and matches the LLM definitions', () => {
  assert.deepEqual(TOOL_NAMES.sort(), ['compare_redemptions', 'get_loyalty_balance', 'get_recommendation_context', 'search_redemption_options']);
  assert.deepEqual(toolDefinitions.map((t) => t.function.name).sort(), TOOL_NAMES.sort());
});

test('rejects unknown tools, malformed JSON and unexpected keys', async () => {
  assert.throws(() => validateToolArgs('delete_account', {}), /not allowed/);
  assert.throws(() => validateToolArgs('search_redemption_options', '{bad json'), /not valid JSON/);
  assert.throws(() => validateToolArgs('search_redemption_options', '[]'), /JSON object/);
  assert.throws(() => validateToolArgs('search_redemption_options', { destination: 'paris' }), /Must be one of/);
  assert.throws(() => validateToolArgs('get_loyalty_balance', { userId: 'bob' }), /Unrecognized key/);
  const result = await executeTool('get_loyalty_balance', { userId: 'bob' }, ctx());
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid_arguments');
});

test('balance tool reads only the session user, never an argument', async () => {
  const c = ctx('alice');
  const result = await executeTool('get_loyalty_balance', {}, c);
  assert.equal(result.ok, true);
  assert.deepEqual(c.balances.calls, ['alice']);
  assert.ok(result.output.balances.every((b) => !('userId' in b) && !('id' in b)));

  const bob = ctx('bob');
  const bobResult = await executeTool('get_loyalty_balance', {}, bob);
  assert.deepEqual(bobResult.output.balances.map((b) => b.name), ['IHG One Rewards']);
});

test('balance tool refuses without an authenticated user', async () => {
  const result = await executeTool('get_loyalty_balance', {}, ctx(null));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'unauthorized');
});

test('compare re-derives options from ids, ignoring invented ids', async () => {
  const c = ctx('alice', { slots: { destination: 'goa', category: 'hotel' } });
  const result = await executeTool(
    'compare_redemptions',
    { optionIds: ['ht:goa:2:bonvoy-cat4', 'ht:goa:2:free-suite'] },
    c,
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.output.unknownIds, ['ht:goa:2:free-suite']);
  assert.equal(result.output.ranked[0].id, 'ht:goa:2:bonvoy-cat4');
});

test('compare before search is a recoverable tool error', async () => {
  const result = await executeTool('compare_redemptions', {}, ctx());
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'no_options');
});

test('unsupported city in search is reported, not thrown', async () => {
  const result = await executeTool('search_redemption_options', { destination: 'goa', origin: 'goa', category: 'flight' }, ctx());
  assert.equal(result.ok, true);
  assert.equal(result.output.options.length, 0);
  assert.match(result.output.notices[0], /same city/);
});

test('policy retrieval failure degrades to "unavailable"', async () => {
  const c = ctx('alice', { deps: { loadBalances: async () => [], rag: fakeRag({ fail: true }) } });
  const result = await executeTool('get_recommendation_context', { query: 'award taxes' }, c);
  assert.equal(result.ok, true);
  assert.equal(result.output.unavailable, true);
  assert.equal(c.state.evidenceStatus, 'unavailable');
});

test('empty retrieval marks evidence insufficient', async () => {
  const c = ctx('alice', { deps: { loadBalances: async () => [], rag: fakeRag({ evidence: [] }) } });
  await executeTool('get_recommendation_context', { query: 'weather in paris' }, c);
  assert.equal(c.state.evidenceStatus, 'insufficient');
});

test('slow tools time out', async () => {
  const c = ctx('alice', {
    deps: { loadBalances: () => new Promise(() => {}), rag: fakeRag() },
    config: { toolTimeoutMs: 50 },
  });
  const result = await executeTool('get_loyalty_balance', {}, c);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'timeout');
});

test('null optional arguments are treated as omitted, and advertised as nullable', async () => {
  assert.deepEqual(validateToolArgs('get_loyalty_balance', { program: null }), {});
  const search = toolDefinitions.find((t) => t.function.name === 'search_redemption_options').function.parameters;
  assert.deepEqual(search.properties.origin.type, ['string', 'null']);
  assert.ok(search.properties.origin.enum.includes(null));
  assert.equal(search.properties.destination.type, 'string', 'required params stay non-null');
});

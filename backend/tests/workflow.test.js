import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createConversationStore } from '../agent/conversationStore.js';
import { checkNarrative, verifyNumbers } from '../agent/narrative.js';
import { fakeRag, makeAgent, scriptedLlm, toolCall } from './helpers.js';

const alice = { id: 'alice', homeCity: 'Delhi' };
const bob = { id: 'bob', homeCity: null };

test('LLM-selected tools drive the recommendation, in order', async () => {
  const llm = scriptedLlm([
    { content: '', toolCalls: [toolCall('get_loyalty_balance', {})] },
    { content: '', toolCalls: [toolCall('search_redemption_options', { destination: 'goa', category: 'hotel', nights: 2 })] },
    { content: '', toolCalls: [toolCall('compare_redemptions', {})] },
    { content: '', toolCalls: [toolCall('get_recommendation_context', { query: 'hotel award rules' })] },
    { content: 'DONE', toolCalls: [] },
    { content: 'The top option is a Category 4 upscale hotel with Marriott Bonvoy, per the sample catalog [P1].', toolCalls: [] },
  ]);
  const { agent } = makeAgent({ llm, config: { maxLlmTurns: 5 } });
  const res = await agent.run({ user: alice, message: 'Best hotel redemption in Goa for 2 nights' });

  assert.equal(res.status, 'answered');
  assert.equal(res.planner, 'llm');
  assert.deepEqual(res.trace.map((t) => [t.tool, t.planner]), [
    ['get_loyalty_balance', 'llm'],
    ['search_redemption_options', 'llm'],
    ['compare_redemptions', 'llm'],
    ['get_recommendation_context', 'llm'],
  ]);
  assert.equal(res.narrativeSource, 'llm');
  assert.equal(res.recommendation.id, 'ht:goa:2:bonvoy-cat4');
  assert.ok(res.calculations.length >= 3);
  assert.equal(res.evidence[0].tag, 'P1');
  assert.ok(res.notices.some((n) => /sample/.test(n)));
  assert.equal(res.readOnly, true);
});

test('workflow fills mandatory steps the LLM skipped', async () => {
  const llm = scriptedLlm([{ content: 'DONE', toolCalls: [] }, { content: 'Short.', toolCalls: [] }]);
  const { agent } = makeAgent({ llm });
  const res = await agent.run({ user: alice, message: 'Hotels in Goa' });
  assert.deepEqual(res.trace.map((t) => t.planner), ['workflow', 'workflow', 'workflow', 'workflow']);
  assert.ok(res.recommendation);
  assert.equal(res.narrativeSource, 'template', 'too-short LLM narrative is rejected');
});

test('pinned slots override a model that searches the wrong city', async () => {
  const llm = scriptedLlm([
    { content: '', toolCalls: [toolCall('search_redemption_options', { destination: 'pune', category: 'hotel' })] },
    { content: 'DONE', toolCalls: [] },
  ]);
  const { agent } = makeAgent({ llm });
  const res = await agent.run({ user: alice, message: 'Hotel in Goa for 2 nights' });
  const search = res.trace.find((t) => t.tool === 'search_redemption_options');
  assert.equal(search.args.destination, 'goa');
  assert.equal(search.argsReconciled, true);
  assert.equal(res.recommendation.destination, 'goa');
});

test('a model that never stops is cut off at the tool-call limit', async () => {
  const llm = scriptedLlm([{ content: '', toolCalls: [toolCall('get_loyalty_balance', {})] }]);
  const { agent } = makeAgent({ llm, config: { maxToolCalls: 3, maxLlmTurns: 10 } });
  const res = await agent.run({ user: alice, message: 'Hotel in Goa' });
  assert.equal(res.trace.filter((t) => t.planner === 'llm').length, 3);
  assert.ok(res.usage.llmCalls <= 5);
  assert.ok(res.notices.some((n) => /tool-call limit/.test(n)));
  assert.equal(res.status, 'answered');
});

test('LLM turn limit bounds the loop', async () => {
  const llm = scriptedLlm([{ content: '', toolCalls: [toolCall('get_loyalty_balance', {})] }]);
  const { agent } = makeAgent({ llm, config: { maxToolCalls: 50, maxLlmTurns: 2 } });
  const res = await agent.run({ user: alice, message: 'Hotel in Goa' });
  assert.equal(res.trace.filter((t) => t.planner === 'llm').length, 2);
});

test('invalid tool names and arguments become recoverable errors', async () => {
  const llm = scriptedLlm([
    { content: '', toolCalls: [toolCall('book_hotel', { id: 'x' }), toolCall('search_redemption_options', '{not json')] },
    { content: 'DONE', toolCalls: [] },
  ]);
  const { agent } = makeAgent({ llm });
  const res = await agent.run({ user: alice, message: 'Hotel in Goa' });
  const [bad, malformed] = res.trace;
  assert.equal(bad.status, 'error');
  assert.match(bad.summary, /not allowed/);
  assert.equal(malformed.status, 'error');
  assert.ok(res.recommendation, 'workflow still completes the task');
});

test('provider failure falls back to the deterministic planner', async () => {
  const llm = { complete: async () => { throw Object.assign(new Error('LLM provider returned 500.'), { code: 'provider_error' }); } };
  const { agent } = makeAgent({ llm });
  const res = await agent.run({ user: alice, message: 'Hotel in Goa' });
  assert.equal(res.status, 'answered');
  assert.equal(res.planner, 'workflow');
  assert.equal(res.narrativeSource, 'template');
  assert.ok(res.notices.some((n) => /planner was unavailable/.test(n)));
});

test('narrative with an invented number is replaced by the computed summary', async () => {
  const llm = scriptedLlm([
    { content: 'DONE', toolCalls: [] },
    { content: 'Use Marriott Bonvoy: only 9,999 points for a free stay worth ₹1,23,456 in Goa this weekend.', toolCalls: [] },
  ]);
  const { agent } = makeAgent({ llm });
  const res = await agent.run({ user: alice, message: 'Hotel in Goa' });
  assert.equal(res.narrativeSource, 'template');
  assert.ok(!res.message.includes('9,999'));
  assert.ok(res.notices.some((n) => /fact check/.test(n)));
});

test('overall deadline stops a hung run with a safe error', async () => {
  const llm = { complete: ({ signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))) };
  const { agent } = makeAgent({ llm, config: { totalTimeoutMs: 100 } });
  const res = await agent.run({ user: alice, message: 'Hotel in Goa' });
  assert.ok(['answered', 'error'].includes(res.status));
  if (res.status === 'error') assert.equal(res.error.code, 'timeout');
  assert.ok(!JSON.stringify(res).includes('stack'));
});

test('asks a follow-up question when the destination is missing, then continues', async () => {
  const { agent } = makeAgent();
  const first = await agent.run({ user: alice, message: "I have 40,000 points. What's the best way to use them for a hotel stay?" });
  assert.equal(first.status, 'needs_input');
  assert.equal(first.clarification.field, 'destination');
  assert.equal(first.trace.length, 0, 'no tools run before essentials are known');

  const second = await agent.run({ user: alice, message: 'Goa', conversationId: first.conversationId });
  assert.equal(second.status, 'answered');
  assert.equal(second.slots.category, 'hotel');
  assert.ok(second.notices.some((n) => /You mentioned 40,000 points/.test(n)));
});

test('follow-ups reuse context: fewer points, then why', async () => {
  const { agent } = makeAgent();
  const first = await agent.run({ user: alice, message: 'Hotel in Goa for 2 nights' });
  const fewer = await agent.run({
    user: alice,
    message: 'Find an option that uses fewer points, even if I pay slightly more cash',
    conversationId: first.conversationId,
  });
  assert.equal(fewer.weighting.preset, 'fewer_points');
  assert.ok(fewer.recommendation.metrics.pointsRequired < first.recommendation.metrics.pointsRequired);

  const why = await agent.run({ user: alice, message: 'Why is this redemption better than the alternative?', conversationId: first.conversationId });
  assert.equal(why.intent, 'explain');
  assert.ok(!why.trace.some((t) => t.tool === 'search_redemption_options'), 'reuses earlier options');
  assert.ok(why.headToHead);
  assert.match(why.message, /ranks above/);
});

test('conversations are isolated per user', async () => {
  const store = createConversationStore();
  const { agent, balances } = makeAgent({ store });
  const a = await agent.run({ user: alice, message: 'Hotel in Goa for 2 nights' });
  const b = await agent.run({ user: bob, message: 'Why is this better?', conversationId: a.conversationId });
  assert.notEqual(b.conversationId, a.conversationId, "bob cannot resume alice's conversation");
  assert.equal(b.slots.destination, null);
  assert.ok(!balances.calls.includes('bob') || !JSON.stringify(b).includes('Marriott Bonvoy balance'));
  assert.equal(store.get('bob', a.conversationId), null);
});

test("balances never leak across users", async () => {
  const { agent } = makeAgent();
  const a = await agent.run({ user: alice, message: 'Hotel in Goa for 2 nights' });
  const b = await agent.run({ user: bob, message: 'Hotel in Goa for 2 nights' });
  assert.ok(a.recommendation);
  assert.equal(b.recommendation, null, 'bob only has 5,000 IHG points');
  const leaked = JSON.stringify(b);
  assert.ok(!leaked.includes('HDFC Regalia'), "alice's card balance must not appear");
  assert.ok(!/balance is 40,000/.test(leaked), "alice's Marriott balance must not appear");
  assert.ok(/balance is 5,000/.test(leaked), "bob's own balance is used");
});

test('policy questions retrieve evidence; missing evidence is not invented', async () => {
  const { agent } = makeAgent();
  const res = await agent.run({ user: alice, message: 'Do my points expire?' });
  assert.equal(res.intent, 'policy');
  assert.deepEqual(res.trace.map((t) => t.tool), ['get_recommendation_context']);
  assert.match(res.message, /\[P1\]/);

  const none = makeAgent({ rag: fakeRag({ evidence: [] }) });
  const empty = await none.agent.run({ user: alice, message: 'Do my points expire?' });
  assert.equal(empty.evidenceStatus, 'insufficient');
  assert.match(empty.message, /no policy passage/i);
});

test('RAG outage still yields a recommendation, flagged as unsupported by policy', async () => {
  const { agent } = makeAgent({ rag: fakeRag({ fail: true }) });
  const res = await agent.run({ user: alice, message: 'Hotel in Goa' });
  assert.ok(res.recommendation);
  assert.equal(res.evidenceStatus, 'unavailable');
  assert.ok(res.notices.some((n) => /unavailable/.test(n)));
});

test('booking requests are refused without running tools', async () => {
  const { agent } = makeAgent();
  const res = await agent.run({ user: alice, message: 'Book the Marriott in Goa for me' });
  assert.equal(res.intent, 'action_request');
  assert.equal(res.trace.length, 0);
  assert.match(res.message, /read-only/);
});

test('stored type conflicting with the handbook is surfaced', async () => {
  const rag = fakeRag({
    evidence: [{ id: 'program-marriott', title: 'Marriott', text: 'Marriott Bonvoy is a hotel-type program.', program_key: 'marriott', program_type: 'hotel', score: 0.7 }],
  });
  const balances = {
    calls: [],
    load: async () => [{ name: 'Marriott Bonvoy', programType: 'wallet', points: 50000, valuePerPoint: 0.6, kind: 'program' }],
  };
  const { agent } = makeAgent({ rag, balances });
  const res = await agent.run({ user: alice, message: 'Hotel in Goa' });
  assert.ok(res.notices.some((n) => /stored type for Marriott Bonvoy/.test(n)));
});

test('number verification accepts facts and rejects invented figures', () => {
  const facts = { ranked: [{ pointsRequired: '24,000', valuePerPoint: '₹0.77/pt' }] };
  assert.equal(verifyNumbers('Uses 24,000 points at ₹0.77 per point [P1], top 3 options.', facts).ok, true);
  assert.deepEqual(verifyNumbers('Uses 25,000 points.', facts).unverified, [25000]);
  assert.equal(checkNarrative('I have booked the Marriott stay for 24,000 points.', facts).reason, 'action_claim');
});

test('citations to anything other than real evidence tags are stripped', () => {
  const facts = { policyEvidence: [{ tag: 'P1' }] };
  const check = checkNarrative('The saver award is better because of taxes [ P1 ] and value [whyFirstBeatsSecond][P7][rank 1].', facts);
  assert.equal(check.ok, true);
  assert.equal(check.text, 'The saver award is better because of taxes [P1] and value.');
});

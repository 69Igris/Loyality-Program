// Shared fixtures for agent tests. No network, no database.
import { createAgent } from '../agent/workflow.js';
import { createConversationStore } from '../agent/conversationStore.js';
import { loadAgentConfig } from '../agent/config.js';

export const BALANCES = {
  alice: [
    { name: 'Marriott Bonvoy', programType: 'hotel', points: 40000, valuePerPoint: 0.6, kind: 'program' },
    { name: 'Air India Maharaja Club', programType: 'flight', points: 20000, valuePerPoint: 0.55, kind: 'program' },
    { name: 'HDFC Regalia balance', programType: 'wallet', points: 15000, valuePerPoint: 0.5, kind: 'card' },
  ],
  bob: [{ name: 'IHG One Rewards', programType: 'hotel', points: 5000, valuePerPoint: 0.4, kind: 'program' }],
};

export const EVIDENCE = [
  { id: 'policy-award-taxes', title: 'Award taxes and fees', text: 'Award flights cover the base fare; taxes are paid in cash.', source: 'handbook', score: 0.71, type: 'policy' },
];

export function fakeRag({ evidence = EVIDENCE, fail = false } = {}) {
  const calls = [];
  return {
    calls,
    retrieve: async (body) => {
      calls.push(body);
      if (fail) throw new Error('connect ECONNREFUSED');
      return { evidence, sufficient: evidence.length > 0 };
    },
  };
}

export function fakeBalances() {
  const calls = [];
  return {
    calls,
    load: async (userId) => {
      calls.push(userId);
      return structuredClone(BALANCES[userId] ?? []);
    },
  };
}

// Scripted LLM: each complete() call returns the next scripted reply (or a function result).
export function scriptedLlm(script) {
  const calls = [];
  let i = 0;
  return {
    calls,
    complete: async (args) => {
      calls.push(args);
      const step = script[Math.min(i, script.length - 1)];
      i += 1;
      return typeof step === 'function' ? step(args) : step;
    },
  };
}

export const toolCall = (name, args, id = `call_${name}`) => ({
  id,
  name,
  arguments: typeof args === 'string' ? args : JSON.stringify(args),
});

export function makeAgent({ llm = null, rag = fakeRag(), balances = fakeBalances(), config = {}, store } = {}) {
  const agent = createAgent({
    config: { ...loadAgentConfig(), ...config },
    llm,
    store: store ?? createConversationStore(),
    deps: { loadBalances: balances.load, rag },
  });
  return { agent, rag, balances, llm };
}

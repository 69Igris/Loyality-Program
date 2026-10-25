import express from 'express';
import { createAgent } from '../agent/workflow.js';
import { createConversationStore } from '../agent/conversationStore.js';
import { createGroqClient } from '../agent/llm.js';
import { createRagClient } from '../agent/ragClient.js';
import { loadAgentConfig } from '../agent/config.js';
import { agentChatSchema, createAgentController, loadBalancesForUser } from '../controllers/agentController.js';
import { requireAuth as defaultRequireAuth } from '../middleware/auth.js';
import { agentLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { logger } from '../lib/logger.js';

// Build the router from injectable pieces so tests can supply fakes for the
// LLM, RAG service, database and auth lookup.
export function createAgentRouter({
  agent,
  requireAuth = defaultRequireAuth,
  limiter = agentLimiter,
} = {}) {
  const resolvedAgent = agent ?? buildDefaultAgent();
  const { chat } = createAgentController({ agent: resolvedAgent });

  const router = express.Router();
  router.post('/chat', requireAuth, limiter, validateBody(agentChatSchema), chat);
  return router;
}

export function buildDefaultAgent() {
  const config = loadAgentConfig();
  const llm = createGroqClient({
    apiKey: config.groqApiKey,
    baseUrl: config.groqBaseUrl,
    model: config.model,
    timeoutMs: config.llmTimeoutMs,
    maxTokens: config.maxOutputTokens,
    reasoningEffort: config.reasoningEffort,
  });
  if (!llm) logger.warn('[agent] GROQ_API_KEY not set — agent runs with the deterministic workflow planner only');

  return createAgent({
    config,
    llm,
    log: logger.child({ module: 'agent' }),
    store: createConversationStore({ maxHistoryTurns: config.maxHistoryTurns }),
    deps: {
      loadBalances: loadBalancesForUser,
      rag: createRagClient({ baseUrl: config.ragServiceUrl, timeoutMs: config.toolTimeoutMs }),
    },
  });
}

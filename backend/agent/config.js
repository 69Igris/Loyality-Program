// Agent limits, model and scoring configuration. Everything is overridable via
// env so ops can tighten budgets without a code change.

function intFromEnv(name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

// Weighted-score presets. Each preset must sum to 1 so scores stay on a 0–100 scale.
export const DEFAULT_WEIGHT_PRESETS = {
  balanced: { value: 0.35, cash: 0.2, points: 0.2, preference: 0.15, reliability: 0.1 },
  best_value: { value: 0.5, cash: 0.15, points: 0.1, preference: 0.15, reliability: 0.1 },
  fewer_points: { value: 0.15, cash: 0.15, points: 0.45, preference: 0.15, reliability: 0.1 },
  lower_cash: { value: 0.15, cash: 0.45, points: 0.15, preference: 0.15, reliability: 0.1 },
};

export const SCORING_CRITERIA = ['value', 'cash', 'points', 'preference', 'reliability'];

function normalizePreset(preset) {
  const cleaned = {};
  let total = 0;
  for (const key of SCORING_CRITERIA) {
    const weight = Number(preset?.[key]);
    cleaned[key] = Number.isFinite(weight) && weight >= 0 ? weight : 0;
    total += cleaned[key];
  }
  if (total <= 0) return null;
  for (const key of SCORING_CRITERIA) cleaned[key] = Number((cleaned[key] / total).toFixed(4));
  return cleaned;
}

// AGENT_SCORING_WEIGHTS may override any preset, e.g.
// {"balanced":{"value":0.4,"cash":0.2,"points":0.2,"preference":0.1,"reliability":0.1}}
function loadWeightPresets() {
  const presets = { ...DEFAULT_WEIGHT_PRESETS };
  const raw = process.env.AGENT_SCORING_WEIGHTS;
  if (!raw) return presets;
  try {
    const overrides = JSON.parse(raw);
    for (const [name, preset] of Object.entries(overrides || {})) {
      if (!(name in presets)) continue;
      const normalized = normalizePreset(preset);
      if (normalized) presets[name] = normalized;
    }
  } catch {
    // Invalid JSON falls back to defaults; never crash the server over tuning config.
  }
  return presets;
}

export function loadAgentConfig() {
  return {
    groqApiKey: process.env.GROQ_API_KEY || '',
    groqBaseUrl: (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/+$/, ''),
    // Must support tool calling on Groq. Llama 3.x ids may be retired for some
    // accounts; check GET /openai/v1/models if requests return 404.
    model: process.env.AGENT_LLM_MODEL || 'openai/gpt-oss-120b',
    // Only sent for reasoning models (gpt-oss); keeps latency and tokens down.
    reasoningEffort: process.env.AGENT_REASONING_EFFORT || 'low',
    ragServiceUrl: (process.env.RAG_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, ''),
    maxLlmTurns: intFromEnv('AGENT_MAX_LLM_TURNS', 4, { max: 8 }),
    maxToolCalls: intFromEnv('AGENT_MAX_TOOL_CALLS', 6, { max: 12 }),
    // Extra budget the workflow may spend to run mandatory steps the LLM skipped.
    maxWorkflowToolCalls: intFromEnv('AGENT_MAX_WORKFLOW_TOOL_CALLS', 4, { max: 8 }),
    llmTimeoutMs: intFromEnv('AGENT_LLM_TIMEOUT_MS', 15000, { min: 1000 }),
    toolTimeoutMs: intFromEnv('AGENT_TOOL_TIMEOUT_MS', 6000, { min: 500 }),
    totalTimeoutMs: intFromEnv('AGENT_TOTAL_TIMEOUT_MS', 45000, { min: 2000 }),
    maxOutputTokens: intFromEnv('AGENT_MAX_OUTPUT_TOKENS', 1024, { min: 64, max: 4096 }),
    maxHistoryTurns: intFromEnv('AGENT_MAX_HISTORY_TURNS', 6, { max: 20 }),
    maxMessageChars: intFromEnv('AGENT_MAX_MESSAGE_CHARS', 1000, { min: 50, max: 4000 }),
    weightPresets: loadWeightPresets(),
  };
}

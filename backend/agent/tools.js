// The agent's tool allowlist. Each tool has:
//   - a Zod schema (strict: unknown keys such as `userId` are rejected),
//   - a JSON schema advertised to the LLM,
//   - a read-only handler that takes identity from the server-side context only.
//
// Tool outputs are what the agent's recommendation is built from; the LLM only
// sees compact summaries of them.

import { z } from 'zod';
import { CITIES } from '../lib/pricing.js';
import { getOptionById, matchProgramKey, searchCatalog } from './catalog.js';
import { rankRedemptions } from './scoring.js';

export class ToolError extends Error {
  constructor(message, code = 'tool_error') {
    super(message);
    this.name = 'ToolError';
    this.code = code;
  }
}

const city = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => CITIES.includes(value), { message: `Must be one of: ${CITIES.join(', ')}` });

const PRESETS = ['balanced', 'best_value', 'fewer_points', 'lower_cash'];

export const toolSchemas = {
  get_loyalty_balance: z
    .object({ program: z.string().trim().min(1).max(60).optional() })
    .strict(),
  search_redemption_options: z
    .object({
      destination: city,
      origin: city.optional(),
      category: z.enum(['flight', 'hotel', 'both']).default('both'),
      nights: z.number().int().min(1).max(30).optional(),
      roundTrip: z.boolean().optional(),
    })
    .strict(),
  compare_redemptions: z
    .object({
      optionIds: z.array(z.string().max(80)).min(1).max(20).optional(),
      preference: z.enum(PRESETS).optional(),
      maxPoints: z.number().positive().max(10_000_000).optional(),
      maxCash: z.number().nonnegative().max(10_000_000).optional(),
      preferences: z
        .object({
          nonstop: z.boolean().optional(),
          minStars: z.number().int().min(1).max(5).optional(),
          refundable: z.boolean().optional(),
        })
        .strict()
        .optional(),
    })
    .strict(),
  get_recommendation_context: z
    .object({
      query: z.string().trim().min(3).max(300),
      programs: z.array(z.string().trim().min(1).max(60)).max(5).optional(),
    })
    .strict(),
};

export const TOOL_NAMES = Object.keys(toolSchemas);

// Models often send `null` for optional parameters; Groq validates tool calls
// against the advertised schema, so optional properties must accept null.
function allowNullForOptional(definition) {
  const params = definition.function.parameters;
  const required = new Set(params.required ?? []);
  const properties = Object.fromEntries(
    Object.entries(params.properties).map(([key, prop]) => {
      if (required.has(key)) return [key, prop];
      const nullable = { ...prop, type: [prop.type, 'null'] };
      if (prop.enum) nullable.enum = [...prop.enum, null];
      return [key, nullable];
    }),
  );
  return { ...definition, function: { ...definition.function, parameters: { ...params, properties } } };
}

export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'get_loyalty_balance',
      description:
        "Get the signed-in user's stored loyalty program and card point balances with their conversion rates (₹ per point). Identity comes from the session; never pass a user id.",
      parameters: {
        type: 'object',
        properties: { program: { type: 'string', description: 'Optional program name filter, e.g. "Marriott".' } },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_redemption_options',
      description:
        'Search the sample award catalog for flight and/or hotel redemption options. Returns option ids, points required and cash payable. Not live inventory.',
      parameters: {
        type: 'object',
        properties: {
          destination: { type: 'string', enum: CITIES },
          origin: { type: 'string', enum: CITIES, description: 'Required for flights.' },
          category: { type: 'string', enum: ['flight', 'hotel', 'both'] },
          nights: { type: 'integer', minimum: 1, maximum: 30 },
          roundTrip: { type: 'boolean' },
        },
        required: ['destination'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_redemptions',
      description:
        "Deterministically score and rank redemption options against the user's balances and preferences. Pass option ids from search results (omit to compare everything found). All numbers are computed by the backend.",
      parameters: {
        type: 'object',
        properties: {
          optionIds: { type: 'array', items: { type: 'string' }, maxItems: 20 },
          preference: { type: 'string', enum: PRESETS },
          maxPoints: { type: 'number' },
          maxCash: { type: 'number', description: 'Maximum cash payable in INR.' },
          preferences: {
            type: 'object',
            properties: {
              nonstop: { type: 'boolean' },
              minStars: { type: 'integer', minimum: 1, maximum: 5 },
              refundable: { type: 'boolean' },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recommendation_context',
      description:
        'Retrieve loyalty-program policies and redemption rules from the policy knowledge base (FAISS). Use before answering policy questions.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What policy information is needed.' },
          programs: { type: 'array', items: { type: 'string' }, maxItems: 5 },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
].map(allowNullForOptional);

// Treat explicit nulls as "not provided" before strict validation.
function dropNulls(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => [k, dropNulls(v)]),
    );
  }
  return value;
}

/** Parse + validate raw LLM arguments. Throws ToolError with a model-readable message. */
export function validateToolArgs(name, rawArgs) {
  if (!TOOL_NAMES.includes(name)) throw new ToolError(`Tool "${name}" is not allowed.`, 'unknown_tool');

  let args = rawArgs;
  if (typeof rawArgs === 'string') {
    try {
      args = rawArgs.trim() ? JSON.parse(rawArgs) : {};
    } catch {
      throw new ToolError('Arguments were not valid JSON.', 'invalid_arguments');
    }
  }
  if (args === null || typeof args !== 'object' || Array.isArray(args)) {
    throw new ToolError('Arguments must be a JSON object.', 'invalid_arguments');
  }

  const result = toolSchemas[name].safeParse(dropNulls(args));
  if (!result.success) {
    const detail = result.error.errors
      .slice(0, 4)
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new ToolError(`Invalid arguments: ${detail}`, 'invalid_arguments');
  }
  return result.data;
}

// --- handlers --------------------------------------------------------------

async function ensureBalances(ctx) {
  if (!ctx.state.balances) {
    if (!ctx.userId) throw new ToolError('Authentication required for account data.', 'unauthorized');
    const balances = await ctx.deps.loadBalances(ctx.userId);
    ctx.state.balances = balances.map((b) => ({ ...b, programKey: b.programKey ?? matchProgramKey(b.name) }));
  }
  return ctx.state.balances;
}

async function getLoyaltyBalance(args, ctx) {
  const balances = await ensureBalances(ctx);
  const filter = args.program?.toLowerCase();
  const visible = filter ? balances.filter((b) => b.name.toLowerCase().includes(filter)) : balances;
  return {
    balances: visible.map((b) => ({
      name: b.name,
      programType: b.programType,
      source: b.kind === 'card' ? 'card reward balance' : 'loyalty program',
      points: b.points,
      valuePerPoint: b.valuePerPoint,
    })),
    count: visible.length,
    note: balances.length === 0 ? 'The user has no loyalty programs or card balances on file.' : undefined,
  };
}

function summarizeOption(option) {
  return {
    id: option.id,
    category: option.category,
    program: option.programName,
    title: option.title,
    pointsRequired: option.pointsRequired,
    cashPayable: option.cashComponent,
    cashPrice: option.cashPrice,
    attributes: option.attributes,
  };
}

async function searchRedemptionOptions(args, ctx) {
  let result;
  try {
    result = searchCatalog(args);
  } catch (error) {
    throw new ToolError(error.message, 'unsupported_input');
  }
  for (const option of result.options) ctx.state.options.set(option.id, option);
  ctx.state.searches.push(args);
  return {
    dataSource: 'sample catalog (not live inventory)',
    options: result.options.map(summarizeOption),
    notices: result.notices,
  };
}

async function compareRedemptions(args, ctx) {
  const unknownIds = [];
  let options;
  if (args.optionIds) {
    options = [];
    for (const id of args.optionIds) {
      // Re-derive from the id; never trust option data passed in by the model.
      const option = ctx.state.options.get(id) ?? getOptionById(id);
      if (option) options.push(option);
      else unknownIds.push(id);
    }
  } else {
    options = [...ctx.state.options.values()];
  }
  if (options.length === 0) {
    throw new ToolError(
      unknownIds.length > 0
        ? `None of the option ids were recognised (${unknownIds.slice(0, 3).join(', ')}). Use ids from search_redemption_options.`
        : 'No options to compare. Call search_redemption_options first.',
      'no_options',
    );
  }

  const balances = await ensureBalances(ctx);
  const slots = ctx.slots || {};
  const comparison = rankRedemptions({
    options,
    balances,
    constraints: {
      category: slots.category ?? undefined,
      destination: slots.destination ?? undefined,
      maxPoints: args.maxPoints ?? slots.maxPoints ?? undefined,
      maxCash: args.maxCash ?? slots.maxCash ?? undefined,
    },
    preferences: { ...(slots.preferences || {}), ...(args.preferences || {}) },
    preset: args.preference ?? slots.preset ?? 'balanced',
    // A stated amount ("I have 40k points") only stands in when nothing is on file;
    // it never overrides or supplements stored balances.
    statedPoints: balances.length === 0 ? slots.statedPoints ?? undefined : undefined,
    weightPresets: ctx.config?.weightPresets,
  });
  ctx.state.comparison = { ...comparison, unknownIds };

  return {
    preset: comparison.preset,
    ranked: comparison.ranked.slice(0, 5).map((entry) => ({
      rank: entry.rank,
      id: entry.id,
      title: entry.title,
      program: entry.programName,
      score: entry.score,
      pointsRequired: entry.metrics.pointsRequired,
      cashPayable: entry.metrics.cashPayable,
      valuePerPoint: entry.metrics.valuePerPoint,
      valueRatio: entry.metrics.valueRatio,
    })),
    ineligibleCount: comparison.ineligible.length,
    ineligibleReasons: comparison.ineligible.slice(0, 4).map((i) => `${i.title}: ${i.reasons[0]}`),
    unknownIds,
  };
}

async function getRecommendationContext(args, ctx) {
  try {
    const result = await ctx.deps.rag.retrieve(
      { query: args.query, programs: args.programs ?? [], k: 4 },
      { signal: ctx.signal },
    );
    for (const item of result.evidence) {
      if (!ctx.state.evidence.some((e) => e.id === item.id)) ctx.state.evidence.push(item);
    }
    // The RAG service only returns passages above its relevance threshold.
    ctx.state.evidenceStatus = ctx.state.evidence.length > 0 ? 'sufficient' : 'insufficient';
    return {
      sufficient: Boolean(result.sufficient),
      evidence: result.evidence.map((e) => ({ id: e.id, title: e.title, text: e.text })),
    };
  } catch (error) {
    if (ctx.state.evidenceStatus !== 'sufficient') ctx.state.evidenceStatus = 'unavailable';
    ctx.log?.warn?.({ msg: error.message }, '[agent] policy retrieval failed');
    return { sufficient: false, unavailable: true, evidence: [], note: 'Policy knowledge base is unavailable right now.' };
  }
}

const handlers = {
  get_loyalty_balance: getLoyaltyBalance,
  search_redemption_options: searchRedemptionOptions,
  compare_redemptions: compareRedemptions,
  get_recommendation_context: getRecommendationContext,
};

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new ToolError('Tool timed out.', 'timeout')), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * Validate and run one tool. Never throws: returns { ok, args?, output?, error? }
 * so a bad call becomes a recoverable message for the model, not a crash.
 */
export async function executeTool(name, rawArgs, ctx) {
  let args;
  try {
    args = validateToolArgs(name, rawArgs);
  } catch (error) {
    return { ok: false, error: { code: error.code || 'invalid_arguments', message: error.message } };
  }
  try {
    const output = await withTimeout(handlers[name](args, ctx), ctx.config?.toolTimeoutMs ?? 6000);
    return { ok: true, args, output };
  } catch (error) {
    if (error instanceof ToolError) {
      return { ok: false, args, error: { code: error.code, message: error.message } };
    }
    ctx.log?.error?.({ err: error, tool: name }, '[agent] tool failed');
    return { ok: false, args, error: { code: 'tool_failed', message: 'The tool failed unexpectedly.' } };
  }
}

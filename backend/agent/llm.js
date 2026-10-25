// Minimal Groq chat-completions client (OpenAI-compatible REST API) with
// per-call timeouts and exponential-backoff retries on transient failures.
// Uses global fetch so no extra SDK is needed in the Express service.

export class LlmError extends Error {
  constructor(message, { status, retryable = false, code = 'llm_error' } = {}) {
    super(message);
    this.name = 'LlmError';
    this.status = status;
    this.retryable = retryable;
    this.code = code;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry(fn, { attempts = 3, baseDelayMs = 400, maxDelayMs = 2000, signal } = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (signal?.aborted) throw new LlmError('Request aborted.', { code: 'aborted' });
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (!error?.retryable || attempt === attempts - 1) break;
      await sleep(Math.min(maxDelayMs, baseDelayMs * 2 ** attempt));
    }
  }
  throw lastError;
}

function linkSignals(timeoutMs, parent) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  const onAbort = () => controller.abort(parent.reason);
  parent?.addEventListener?.('abort', onAbort, { once: true });
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer);
      parent?.removeEventListener?.('abort', onAbort);
    },
  };
}

/**
 * Create an LLM client. `fetchImpl` is injectable for deterministic tests.
 * complete({ messages, tools?, toolChoice? }) → { content, toolCalls: [{ id, name, arguments }] }
 */
export function createGroqClient({ apiKey, baseUrl, model, timeoutMs, maxTokens, reasoningEffort, fetchImpl = fetch }) {
  if (!apiKey) return null;

  async function once({ messages, tools, toolChoice, signal }) {
    const { signal: callSignal, dispose } = linkSignals(timeoutMs, signal);
    let response;
    try {
      response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.1,
          max_tokens: maxTokens,
          ...(reasoningEffort && /gpt-oss/.test(model) ? { reasoning_effort: reasoningEffort } : {}),
          ...(tools ? { tools, tool_choice: toolChoice || 'auto', parallel_tool_calls: false } : {}),
        }),
        signal: callSignal,
      });
    } catch {
      if (signal?.aborted) throw new LlmError('Request aborted.', { code: 'aborted' });
      const timedOut = callSignal.aborted;
      throw new LlmError(timedOut ? 'LLM request timed out.' : 'LLM provider unreachable.', {
        retryable: true,
        code: timedOut ? 'timeout' : 'network',
      });
    } finally {
      dispose();
    }

    if (!response.ok) {
      // Only the provider's short error code is kept; the message/body can echo request details.
      let providerCode = null;
      try {
        const body = await response.json();
        if (typeof body?.error?.code === 'string' && /^[a-z_]{1,40}$/.test(body.error.code)) providerCode = body.error.code;
      } catch {
        /* non-JSON error body */
      }
      // tool_use_failed = the model sampled a malformed tool call; a fresh sample usually succeeds.
      const retryable = response.status === 429 || response.status >= 500 || providerCode === 'tool_use_failed';
      throw new LlmError(`LLM provider returned ${response.status}${providerCode ? ` (${providerCode})` : ''}.`, {
        status: response.status,
        retryable,
        code: response.status === 429 ? 'rate_limited' : providerCode || 'provider_error',
      });
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new LlmError('LLM returned malformed JSON.', { code: 'invalid_output' });
    }
    const message = data?.choices?.[0]?.message;
    if (!message || typeof message !== 'object') {
      throw new LlmError('LLM returned no message.', { code: 'invalid_output' });
    }

    const toolCalls = Array.isArray(message.tool_calls)
      ? message.tool_calls.map((call) => ({
          id: `${call?.id ?? ''}`,
          name: `${call?.function?.name ?? ''}`,
          arguments: call?.function?.arguments ?? '',
        }))
      : [];
    return { content: typeof message.content === 'string' ? message.content : '', toolCalls };
  }

  return {
    model,
    complete: (args) => withRetry(() => once(args), { signal: args.signal }),
  };
}

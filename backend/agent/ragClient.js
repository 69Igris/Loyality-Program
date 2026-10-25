// Client for the FastAPI RAG service's /retrieve endpoint (FAISS evidence search).
// Results are policy documents, not user data, so a small shared cache is safe:
// the key covers every input that affects the result.

import { createHash } from 'node:crypto';
import { withRetry } from './llm.js';

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;

export function createRagClient({ baseUrl, timeoutMs, fetchImpl = fetch }) {
  const cache = new Map();

  function cacheKey(body) {
    return createHash('sha256').update(JSON.stringify(body)).digest('hex');
  }

  function readCache(key) {
    const hit = cache.get(key);
    if (!hit) return null;
    if (Date.now() - hit.at > CACHE_TTL_MS) {
      cache.delete(key);
      return null;
    }
    cache.delete(key);
    cache.set(key, hit); // refresh LRU position
    return hit.value;
  }

  function writeCache(key, value) {
    cache.set(key, { at: Date.now(), value });
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  }

  async function retrieve({ query, k = 4, programs = [], minScore }, { signal } = {}) {
    const body = { query, k, programs: [...programs].sort(), ...(minScore !== undefined ? { min_score: minScore } : {}) };
    const key = cacheKey(body);
    const cached = readCache(key);
    if (cached) return { ...cached, cached: true };

    const value = await withRetry(
      async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const onAbort = () => controller.abort();
        signal?.addEventListener?.('abort', onAbort, { once: true });
        try {
          const response = await fetchImpl(`${baseUrl}/retrieve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          if (!response.ok) {
            const error = new Error(`RAG service returned ${response.status}.`);
            error.retryable = response.status >= 500 && response.status !== 503;
            throw error;
          }
          const data = await response.json();
          if (!data || !Array.isArray(data.evidence)) throw new Error('RAG service returned an unexpected payload.');
          return data;
        } catch (error) {
          if (error.name === 'AbortError') {
            const timeout = new Error('RAG service timed out.');
            timeout.retryable = !signal?.aborted;
            throw timeout;
          }
          if (error.retryable === undefined) error.retryable = true;
          throw error;
        } finally {
          clearTimeout(timer);
          signal?.removeEventListener?.('abort', onAbort);
        }
      },
      { attempts: 2, baseDelayMs: 250, signal },
    );

    writeCache(key, value);
    return { ...value, cached: false };
  }

  return { retrieve };
}

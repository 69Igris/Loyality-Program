// Bounded in-memory conversation memory. Entries are keyed by userId AND
// conversationId, so a conversation id leaked to another user resolves to
// nothing. Balances are never stored here — they are re-read every turn.
// Memory is per-process: it resets on restart and is not shared across replicas.

const DEFAULT_TTL_MS = 60 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 1000;

export function createConversationStore({ ttlMs = DEFAULT_TTL_MS, maxEntries = DEFAULT_MAX_ENTRIES, maxHistoryTurns = 6 } = {}) {
  const entries = new Map();

  const key = (userId, conversationId) => `${userId}::${conversationId}`;

  function get(userId, conversationId) {
    if (!userId || !conversationId) return null;
    const k = key(userId, conversationId);
    const entry = entries.get(k);
    if (!entry) return null;
    if (Date.now() - entry.updatedAt > ttlMs) {
      entries.delete(k);
      return null;
    }
    return entry;
  }

  function save(userId, conversationId, { slots, userMessage, assistantMessage, lastOptionIds, pendingField }) {
    const k = key(userId, conversationId);
    const previous = entries.get(k);
    const history = [...(previous?.history ?? [])];
    if (userMessage) history.push({ role: 'user', content: userMessage });
    if (assistantMessage) history.push({ role: 'assistant', content: assistantMessage });

    entries.delete(k); // re-insert to refresh LRU order
    entries.set(k, {
      slots,
      history: history.slice(-maxHistoryTurns * 2),
      lastOptionIds: lastOptionIds ?? previous?.lastOptionIds ?? [],
      pendingField: pendingField ?? null,
      updatedAt: Date.now(),
    });
    while (entries.size > maxEntries) entries.delete(entries.keys().next().value);
  }

  function clear(userId, conversationId) {
    return entries.delete(key(userId, conversationId));
  }

  return { get, save, clear, size: () => entries.size };
}

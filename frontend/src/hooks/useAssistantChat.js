import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { assistant } from '../services/api';
import { friendlyAgentError } from '../services/agentStream';

let nextId = 0;
const newId = () => `m${(nextId += 1)}`;

const hasDetails = (result) => Boolean(result?.recommendation || result?.ineligible?.length || result?.evidence?.length);

// Conversation state for the assistant. Lives in the always-mounted widget, so
// the conversation survives route changes.
export function useAssistantChat() {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const updateMessage = useCallback((id, patch) => {
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m)));
  }, []);

  const send = useCallback(
    async (text) => {
      const message = `${text ?? ''}`.trim();
      if (!message || busy) return null;
      const assistantId = newId();
      setMessages((list) => [
        ...list,
        { id: newId(), role: 'user', text: message },
        { id: assistantId, role: 'assistant', status: 'streaming', events: [], prompt: message },
      ]);
      setBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const result = await assistant.chat(
          { message, conversationId },
          {
            signal: controller.signal,
            onEvent: (event) => updateMessage(assistantId, (m) => ({ events: [...m.events, event] })),
          },
        );
        if (result.status === 'error') {
          updateMessage(assistantId, { status: 'error', error: result.message });
        } else {
          updateMessage(assistantId, { status: 'done', result });
          if (hasDetails(result)) setSelectedId(assistantId);
        }
        if (result.conversationId) setConversationId(result.conversationId);
        return result;
      } catch (error) {
        updateMessage(assistantId, { status: 'error', error: friendlyAgentError(error) });
        return null;
      } finally {
        abortRef.current = null;
        setBusy(false);
      }
    },
    [busy, conversationId, updateMessage],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setSelectedId(null);
  }, []);

  const selected = useMemo(() => messages.find((m) => m.id === selectedId)?.result ?? null, [messages, selectedId]);

  return { messages, busy, send, reset, selectedId, setSelectedId, selected, hasDetails };
}

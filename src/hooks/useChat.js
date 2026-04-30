import { useState, useCallback } from 'react';

const SESSION_CAP = 10;

export default function useChat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);

  const inputDisabled = interactionCount >= SESSION_CAP;

  const sendMessage = useCallback(
    async (text) => {
      const userMessage = { role: 'user', content: text };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setLoading(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: nextMessages.map(({ role, content, parsedFields }) => ({
              role,
              content,
              ...(parsedFields ? { parsedFields } : {}),
            })),
          }),
        });

        const data = await response.json();
        const assistantContent = data.reply ?? data.message ?? data.assistantMessage ?? '';
        const assistantMessage = {
          role: 'assistant',
          content: assistantContent,
          ...(data.parsedFields ? { parsedFields: data.parsedFields } : {}),
          _raw: data,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setInteractionCount((prev) => prev + 1);
      } finally {
        setLoading(false);
      }
    },
    [messages]
  );

  const resetConversation = useCallback(() => {
    setMessages([]);
    setInteractionCount(0);
  }, []);

  const resumeWithConflict = useCallback(
    async (conflictData) => {
      const { booker_name, room_id, start_utc, end_utc } = conflictData;
      const conflictMsg = {
        role: 'user',
        content: `The slot was just taken. Conflicting booking: ${booker_name} has ${room_id} from ${start_utc} to ${end_utc}. Please suggest alternatives.`,
      };
      // Build extended messages for the API call (includes the conflict context)
      // but do NOT render the conflict user message in the visible chat history
      const messagesForApi = [...messages, conflictMsg];
      setLoading(true);
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messagesForApi.map(({ role, content, parsedFields }) => ({
              role,
              content,
              ...(parsedFields ? { parsedFields } : {}),
            })),
          }),
        });
        const data = await response.json();
        const assistantContent = data.reply ?? data.message ?? data.assistantMessage ?? '';
        setMessages((prev) => {
          // Remove ready-to-confirm status from prior assistant messages so the
          // confirm card no longer renders after a conflict
          const cleared = prev.map((m) =>
            m.role === 'assistant' && m._raw?.status === 'ready-to-confirm'
              ? { ...m, _raw: { ...m._raw, status: 'conflict-dismissed' } }
              : m
          );
          return [...cleared, { role: 'assistant', content: assistantContent, _raw: data }];
        });
      } finally {
        setLoading(false);
      }
    },
    [messages]
  );

  return {
    messages,
    loading,
    sendMessage,
    resetConversation,
    interactionCount,
    inputDisabled,
    resumeWithConflict,
  };
}

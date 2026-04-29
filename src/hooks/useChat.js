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

  return { messages, loading, sendMessage, resetConversation, interactionCount, inputDisabled };
}

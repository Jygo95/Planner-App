import { useState, useCallback } from 'react';

export default function useChat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

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
          body: JSON.stringify({ messages: nextMessages }),
        });

        const data = await response.json();
        const assistantContent = data.reply ?? data.message ?? '';
        const assistantMessage = { role: 'assistant', content: assistantContent, _raw: data };
        setMessages((prev) => [...prev, assistantMessage]);
      } finally {
        setLoading(false);
      }
    },
    [messages]
  );

  const resetConversation = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, loading, sendMessage, resetConversation };
}

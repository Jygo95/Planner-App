import { useState } from 'react';
import ChatInput from './ChatInput.jsx';
import ChatHistory from './ChatHistory.jsx';
import ChatConfirmCard from './ChatConfirmCard.jsx';
import LLMUnavailableBanner from './LLMUnavailableBanner.jsx';
import ManualForm from '../ManualForm/ManualForm.jsx';
import useChat from '../../hooks/useChat.js';
import useHealthPoll from '../../hooks/useHealthPoll.js';
import './ChatDock.css';

const PARSE_FAILURE_MSG =
  "I couldn't find any booking details in that. Could you describe what you'd like to book? (e.g. 'Nevada room tomorrow 2–3pm for Alice')";

const CANCEL_MSG = 'Booking cancelled. What would you like to change?';

export default function ChatDock() {
  const { llmAvailable, triggerPoll } = useHealthPoll();
  const { messages, loading, sendMessage, resetConversation } = useChat();
  const [inputValue, setInputValue] = useState('');

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || loading) return;
    setInputValue('');
    await sendMessage(text);
  }

  function handleFocus() {
    triggerPoll();
  }

  // Build display messages — inject confirm cards for ready-to-confirm
  const displayMessages = messages.map((msg) => {
    if (msg.role === 'assistant' && msg._raw) {
      const raw = msg._raw;
      if (raw.status === 'ready-to-confirm' && raw.parsedFields) {
        return {
          ...msg,
          content: (
            <ChatConfirmCard
              {...raw.parsedFields}
              onConfirm={async () => {
                try {
                  const res = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(raw.parsedFields),
                  });
                  if (res.status === 201) {
                    resetConversation();
                  }
                } catch {
                  // ignore
                }
              }}
              onCancel={() => {
                sendMessage(CANCEL_MSG);
              }}
            />
          ),
        };
      }
      if (raw.status === 'parse-failure') {
        return { ...msg, content: PARSE_FAILURE_MSG };
      }
    }
    return msg;
  });

  return (
    <div className="chat-dock">
      <LLMUnavailableBanner llmAvailable={llmAvailable} />
      <div className="chat-dock__history-wrapper">
        <ChatHistory messages={displayMessages} />
      </div>
      {llmAvailable ? (
        <ChatInput
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onSend={handleSend}
          loading={loading}
          onFocus={handleFocus}
        />
      ) : (
        <ManualForm />
      )}
    </div>
  );
}

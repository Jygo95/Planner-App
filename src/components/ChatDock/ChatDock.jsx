import { useState } from 'react';
import ChatInput from './ChatInput.jsx';
import ChatHistory from './ChatHistory.jsx';
import ChatConfirmCard from './ChatConfirmCard.jsx';
import LLMUnavailableBanner from './LLMUnavailableBanner.jsx';
import InteractionBanner from './InteractionBanner.jsx';
import ManualForm from '../ManualForm/ManualForm.jsx';
import Toast from '../Toast/Toast.jsx';
import useChat from '../../hooks/useChat.js';
import useHealthPoll from '../../hooks/useHealthPoll.js';
import './ChatDock.css';

const PARSE_FAILURE_MSG =
  "I couldn't find any booking details in that. Could you describe what you'd like to book? (e.g. 'Nevada room tomorrow 2–3pm for Alice')";

function toRigaTimeParts(utcStr) {
  const d = new Date(utcStr);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Riga',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

function parsedFieldsToCardProps(pf) {
  const start = toRigaTimeParts(pf.start_utc);
  const end = toRigaTimeParts(pf.end_utc);
  return {
    room: pf.room_id ?? '',
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    bookerName: pf.booker_name ?? '',
    description: pf.description ?? '',
    timeAdjusted: pf.timeAdjusted ?? false,
  };
}

const CANCEL_MSG = 'Booking cancelled. What would you like to change?';

export default function ChatDock() {
  const { llmAvailable, triggerPoll } = useHealthPoll();
  const {
    messages,
    loading,
    sendMessage,
    resetConversation,
    interactionCount,
    inputDisabled,
    resumeWithConflict,
  } = useChat();
  const [inputValue, setInputValue] = useState('');
  const [toast, setToast] = useState(null);

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
            <>
              {msg.content && <p style={{ margin: '0 0 8px' }}>{msg.content}</p>}
              <ChatConfirmCard
                {...parsedFieldsToCardProps(raw.parsedFields)}
                onConfirm={async () => {
                  try {
                    const res = await fetch('/api/bookings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(raw.parsedFields),
                    });
                    if (res.status === 201) {
                      resetConversation();
                      setInputValue('');
                    } else if (res.status === 409) {
                      const errData = await res.json();
                      const booker = errData.conflicting?.booker_name ?? 'Someone';
                      setToast({
                        message: `That slot was just taken by ${booker}. Please pick another time or room.`,
                      });
                      setTimeout(() => resumeWithConflict(errData.conflicting), 0);
                    }
                  } catch {
                    // ignore
                  }
                }}
                onCancel={() => {
                  sendMessage(CANCEL_MSG);
                }}
              />
            </>
          ),
        };
      }
      if (raw.status === 'parse-failure' && raw.error !== 'too-short' && raw.error !== 'too-far') {
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
      <InteractionBanner interactionCount={interactionCount} />
      {llmAvailable ? (
        <ChatInput
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onSend={handleSend}
          loading={loading}
          onFocus={handleFocus}
          disabled={inputDisabled}
        />
      ) : (
        <ManualForm />
      )}
      {toast && <Toast message={toast.message} onDismiss={() => setToast(null)} />}
    </div>
  );
}

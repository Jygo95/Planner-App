import { useState, useEffect, useRef } from 'react';
import ChatInput from './ChatInput.jsx';
import ChatHistory from './ChatHistory.jsx';
import ChatConfirmCard from './ChatConfirmCard.jsx';
import LLMUnavailableBanner from './LLMUnavailableBanner.jsx';
import InteractionBanner from './InteractionBanner.jsx';
import ManualForm from '../ManualForm/ManualForm.jsx';
import WebGLRefraction from './WebGLRefraction.jsx';
import useChat from '../../hooks/useChat.js';
import useHealthPoll from '../../hooks/useHealthPoll.js';
import useWebGLSetting from '../../hooks/useWebGLSetting.js';
import { useToast } from '../../context/ToastContext.jsx';
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
  const { showToast } = useToast();
  const { llmAvailable, triggerPoll } = useHealthPoll();
  const { webglEnabled } = useWebGLSetting();
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
  const [serverUnreachable, setServerUnreachable] = useState(false);
  const prevLlmAvailable = useRef(true);

  // Show toast when LLM becomes unreachable
  useEffect(() => {
    if (prevLlmAvailable.current && !llmAvailable) {
      showToast('AI assistant is unreachable. Please use the manual form.');
    }
    prevLlmAvailable.current = llmAvailable;
  }, [llmAvailable, showToast]);

  // Health poll every 30 s to clear serverUnreachable
  useEffect(() => {
    if (!serverUnreachable) return;
    const id = setInterval(() => {
      fetch('/api/health')
        .then((res) => res.json())
        .then(() => setServerUnreachable(false))
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, [serverUnreachable]);

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || loading) return;
    setInputValue('');
    await sendMessage(text);
  }

  function handleFocus() {
    triggerPoll();
    // Clear server-unreachable on next user interaction by re-checking health
    if (serverUnreachable) {
      fetch('/api/health')
        .then((res) => res.json())
        .then(() => setServerUnreachable(false))
        .catch(() => {});
    }
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
                      setServerUnreachable(false);
                      showToast('Booking confirmed.');
                      resetConversation();
                      setInputValue('');
                    } else if (res.status === 409) {
                      const errData = await res.json();
                      showToast(
                        `That slot was just taken by ${errData.conflicting?.booker_name ?? 'someone'}. Please pick another time or room.`,
                        'error'
                      );
                      setTimeout(() => resumeWithConflict(errData.conflicting), 100);
                    } else if (res.status === 429) {
                      showToast('AI assistant unavailable today. Please use the manual form.');
                    }
                  } catch (err) {
                    if (err instanceof TypeError) {
                      showToast('Server unreachable. Please try again.');
                      setServerUnreachable(true);
                    }
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
      <WebGLRefraction enabled={webglEnabled} />
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
          disabled={inputDisabled || serverUnreachable}
        />
      ) : (
        <ManualForm />
      )}
    </div>
  );
}

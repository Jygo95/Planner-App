import { useEffect, useRef } from 'react';

export default function ChatHistory({ messages }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current && typeof bottomRef.current.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <ul className="chat-history">
      {messages.map((msg, index) => {
        const isLast = index === messages.length - 1;
        return (
          <li
            key={msg.id ?? index}
            className={`chat-history__item chat-history__item--${msg.role}`}
            data-role={msg.role}
            data-testid={isLast ? 'last-message' : undefined}
            ref={isLast ? bottomRef : undefined}
          >
            {msg.content}
          </li>
        );
      })}
    </ul>
  );
}

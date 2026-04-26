export default function ChatInput({ value, onChange, onSend, loading, onFocus }) {
  const count = value.length;
  const isWarn = count >= 270;

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && value.trim() && !loading) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="chat-input">
      <textarea
        className="chat-input__textarea"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        maxLength={300}
        placeholder="Type a message…"
        rows={3}
      />
      <div className="chat-input__footer">
        <span className="chat-input__counter" style={isWarn ? { color: 'red' } : undefined}>
          {count} / 300
        </span>
        <button
          type="button"
          className="chat-input__send"
          onClick={onSend}
          disabled={!value.trim() || loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}

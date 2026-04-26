export default function ChatMessage({ role, content }) {
  return (
    <div className={`chat-message chat-message--${role}`} data-role={role}>
      <div className="chat-message__bubble">{content}</div>
    </div>
  );
}

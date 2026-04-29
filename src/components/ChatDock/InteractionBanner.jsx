/**
 * InteractionBanner — session cap warning / limit message (FR-CHAT-4).
 *
 * interactionCount 0–4  → renders nothing
 * interactionCount 5–9  → "N interactions left, wrap it up, please."
 * interactionCount 10+  → session-limit disabled message
 */

export default function InteractionBanner({ interactionCount }) {
  if (interactionCount < 5) return null;

  if (interactionCount >= 10) {
    return (
      <div className="interaction-banner interaction-banner--disabled">
        You've reached the session limit. Please refresh the page or use the manual form.
      </div>
    );
  }

  const left = 10 - interactionCount;
  const noun = left === 1 ? 'interaction' : 'interactions';
  return (
    <div className="interaction-banner">
      {left} {noun} left, wrap it up, please.
    </div>
  );
}

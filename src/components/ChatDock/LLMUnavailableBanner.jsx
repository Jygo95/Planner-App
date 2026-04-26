export default function LLMUnavailableBanner({ llmAvailable }) {
  if (llmAvailable) return null;

  return (
    <div role="alert" className="llm-unavailable-banner">
      AI assistant unavailable. Please use the manual form.
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';

export default function useHealthPoll() {
  const [llmAvailable, setLlmAvailable] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setLlmAvailable(data.llmAvailable !== false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLlmAvailable(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pollCount]);

  const triggerPoll = useCallback(() => {
    setPollCount((c) => c + 1);
  }, []);

  return { llmAvailable, triggerPoll };
}

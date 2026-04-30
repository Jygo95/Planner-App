import { useEffect } from 'react';
import './Toast.css';

export default function Toast({ message, onDismiss, duration = 5000 }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast__message">{message}</span>
      <button type="button" className="toast__close" aria-label="Close" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}

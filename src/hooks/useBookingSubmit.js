import { useState } from 'react';

export default function useBookingSubmit({ onSuccess }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(payload) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok && response.status === 201) {
        const booking = await response.json();
        onSuccess(booking);
      } else if (response.status === 409) {
        const body = await response.json();
        setError({ type: 'conflict', bookerName: body.bookerName });
      } else {
        const body = await response.json();
        setError({ type: 'rule_error', error: body.error });
      }
    } catch {
      setError({ type: 'network_error' });
    } finally {
      setLoading(false);
    }
  }

  return { submit, error, loading };
}

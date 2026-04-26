import { useState } from 'react';

export default function useBookingActions({ onSuccess, onError } = {}) {
  const [error, setError] = useState(null);

  async function patch(id, body) {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.status === 200) {
      const updated = await res.json();
      setError(null);
      if (onSuccess) onSuccess(updated);
    } else if (res.status === 409) {
      const data = await res.json();
      const err = { type: 'conflict', bookerName: data.bookerName };
      setError(err);
      if (onError) onError(err);
    } else {
      const err = { type: 'error', status: res.status };
      setError(err);
      if (onError) onError(err);
    }
  }

  async function deleteBooking(id) {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'DELETE',
    });

    if (res.status === 204) {
      setError(null);
      if (onSuccess) onSuccess();
    } else {
      const err = { type: 'error', status: res.status };
      setError(err);
      if (onError) onError(err);
    }
  }

  return { patch, delete: deleteBooking, deleteBooking, error };
}

export { useBookingActions };

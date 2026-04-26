import { useReducer, useEffect } from 'react';

const initialState = { bookings: [], loading: false, error: null };

function reducer(state, action) {
  switch (action.type) {
    case 'fetch_start':
      return { bookings: [], loading: true, error: null };
    case 'fetch_success':
      return { bookings: action.data, loading: false, error: null };
    case 'fetch_error':
      return { bookings: [], loading: false, error: action.error };
    default:
      return state;
  }
}

export default function useBookings({ from, to }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!from || !to) return;

    let cancelled = false;
    dispatch({ type: 'fetch_start' });

    const url = `/api/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          dispatch({ type: 'fetch_success', data });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          dispatch({ type: 'fetch_error', error: err.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [from, to]);

  return state;
}

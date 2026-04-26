import { renderHook, waitFor } from '@testing-library/react';
import useBookings from './useBookings.js';

describe('useBookings', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls GET /api/bookings with correct from and to query params', async () => {
    const mockBookings = [
      {
        id: 1,
        room_id: 'california',
        start_utc: '2026-04-26T09:00:00Z',
        end_utc: '2026-04-26T10:00:00Z',
        booker_name: 'Alice',
      },
    ];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockBookings,
    });

    const from = '2026-04-26T00:00:00Z';
    const to = '2026-04-26T23:59:59Z';
    renderHook(() => useBookings({ from, to }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledOnce();
    });

    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl).toContain('/api/bookings');
    expect(calledUrl).toContain(`from=${encodeURIComponent(from)}`);
    expect(calledUrl).toContain(`to=${encodeURIComponent(to)}`);
  });

  it('returns a parsed array of booking objects', async () => {
    const mockBookings = [
      {
        id: 1,
        room_id: 'nevada',
        start_utc: '2026-04-26T13:00:00Z',
        end_utc: '2026-04-26T14:00:00Z',
        booker_name: 'Bob',
      },
      {
        id: 2,
        room_id: 'oregon',
        start_utc: '2026-04-26T15:00:00Z',
        end_utc: '2026-04-26T16:00:00Z',
        booker_name: 'Carol',
      },
    ];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockBookings,
    });

    const { result } = renderHook(() =>
      useBookings({ from: '2026-04-26T00:00:00Z', to: '2026-04-26T23:59:59Z' })
    );

    await waitFor(() => {
      expect(result.current.bookings).toHaveLength(2);
    });

    expect(result.current.bookings[0]).toMatchObject({ id: 1, booker_name: 'Bob' });
    expect(result.current.bookings[1]).toMatchObject({ id: 2, booker_name: 'Carol' });
  });

  it('re-fetches when from or to changes', async () => {
    const mockBookings = [];
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockBookings,
    });

    const { rerender } = renderHook(({ from, to }) => useBookings({ from, to }), {
      initialProps: {
        from: '2026-04-26T00:00:00Z',
        to: '2026-04-26T23:59:59Z',
      },
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    rerender({
      from: '2026-04-27T00:00:00Z',
      to: '2026-04-27T23:59:59Z',
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    const secondCallUrl = fetch.mock.calls[1][0];
    expect(secondCallUrl).toContain('2026-04-27');
  });
});

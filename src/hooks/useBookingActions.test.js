import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import useBookingActions from './useBookingActions.js';

describe('useBookingActions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('patch(id, body)', () => {
    it('sends PATCH to /api/bookings/:id with correct JSON body', async () => {
      const patchResponse = { id: 'abc-123', booker_name: 'Alice Updated' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => patchResponse,
      });

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useBookingActions({ onSuccess }));

      await act(async () => {
        await result.current.patch('abc-123', { booker_name: 'Alice Updated' });
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/bookings/abc-123',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ booker_name: 'Alice Updated' }),
        })
      );
    });

    it('calls onSuccess with the updated booking when PATCH responds with 200', async () => {
      const patchResponse = { id: 'abc-123', booker_name: 'Alice Updated' };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => patchResponse,
      });

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useBookingActions({ onSuccess }));

      await act(async () => {
        await result.current.patch('abc-123', { booker_name: 'Alice Updated' });
      });

      expect(onSuccess).toHaveBeenCalledWith(patchResponse);
    });

    it('returns conflict error shape when PATCH responds with 409', async () => {
      const conflictResponse = { bookerName: 'Bob', message: 'Room already booked' };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => conflictResponse,
      });

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useBookingActions({ onSuccess }));

      await act(async () => {
        await result.current.patch('abc-123', { start_utc: '2026-04-26T09:00:00.000Z' });
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(result.current.error).toMatchObject({
        type: 'conflict',
        bookerName: 'Bob',
      });
    });
  });

  describe('delete(id)', () => {
    it('sends DELETE to /api/bookings/:id', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => null,
      });

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useBookingActions({ onSuccess }));

      await act(async () => {
        await result.current.delete('abc-123');
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/bookings/abc-123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('calls onSuccess when DELETE responds with 204', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => null,
      });

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useBookingActions({ onSuccess }));

      await act(async () => {
        await result.current.delete('abc-123');
      });

      expect(onSuccess).toHaveBeenCalled();
    });
  });
});

import { renderHook, act } from '@testing-library/react';
import useBookingSubmit from './useBookingSubmit.js';

const validBooking = {
  room: 'california',
  date: '2026-05-01',
  startTime: '09:00',
  endTime: '10:00',
  bookerName: 'Alice',
  description: '',
};

describe('useBookingSubmit', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onSuccess with the booking object when POST resolves with 201', async () => {
    const bookingResponse = { id: 1, ...validBooking };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => bookingResponse,
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useBookingSubmit({ onSuccess }));

    await act(async () => {
      await result.current.submit(validBooking);
    });

    expect(onSuccess).toHaveBeenCalledWith(bookingResponse);
    expect(result.current.error).toBeNull();
  });

  it('returns conflict error shape when POST resolves with 409', async () => {
    const conflictResponse = { bookerName: 'Bob', message: 'Room already booked' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => conflictResponse,
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useBookingSubmit({ onSuccess }));

    await act(async () => {
      await result.current.submit(validBooking);
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.error).toMatchObject({
      type: 'conflict',
      bookerName: 'Bob',
    });
  });

  it('returns rule_error shape when POST resolves with 400', async () => {
    const errorResponse = { error: 'Booking outside allowed hours' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => errorResponse,
    });

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useBookingSubmit({ onSuccess }));

    await act(async () => {
      await result.current.submit(validBooking);
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.error).toMatchObject({
      type: 'rule_error',
      error: 'Booking outside allowed hours',
    });
  });

  it('returns network_error shape when fetch rejects', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network failure'));

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useBookingSubmit({ onSuccess }));

    await act(async () => {
      await result.current.submit(validBooking);
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.error).toMatchObject({
      type: 'network_error',
    });
  });
});

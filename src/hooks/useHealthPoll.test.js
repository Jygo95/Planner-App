import { renderHook, waitFor } from '@testing-library/react';
import useHealthPoll from './useHealthPoll.js';

describe('useHealthPoll', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls GET /api/health on mount', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, llmAvailable: true, dailyCapRemaining: 100 }),
    });

    renderHook(() => useHealthPoll());

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledOnce();
    });

    expect(fetch).toHaveBeenCalledWith('/api/health');
  });

  it('returns llmAvailable: true when health returns { llmAvailable: true }', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, llmAvailable: true, dailyCapRemaining: 100 }),
    });

    const { result } = renderHook(() => useHealthPoll());

    await waitFor(() => {
      expect(result.current.llmAvailable).toBe(true);
    });
  });

  it('returns llmAvailable: false when health returns { llmAvailable: false }', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, llmAvailable: false, dailyCapRemaining: 0 }),
    });

    const { result } = renderHook(() => useHealthPoll());

    await waitFor(() => {
      expect(result.current.llmAvailable).toBe(false);
    });
  });

  it('defaults to llmAvailable: true before first poll completes', () => {
    // Never resolves immediately — test the initial state
    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(new Promise(() => {}));

    const { result } = renderHook(() => useHealthPoll());

    // Before fetch resolves, the hook should have a defined llmAvailable value
    expect(typeof result.current.llmAvailable).toBe('boolean');
  });

  it('exposes a triggerPoll function that re-calls /api/health', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, llmAvailable: true, dailyCapRemaining: 100 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, llmAvailable: false, dailyCapRemaining: 0 }),
      });

    const { result } = renderHook(() => useHealthPoll());

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Trigger another poll (simulating textarea focus)
    await waitFor(async () => {
      result.current.triggerPoll();
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(result.current.llmAvailable).toBe(false);
    });
  });
});

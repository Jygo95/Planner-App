import { renderHook, act, waitFor } from '@testing-library/react';
import useChat from './useChat.js';

describe('useChat', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('POSTs to /api/chat with the full messages array including the new user message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: 'Hello back!' }),
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/chat');
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    expect(body.messages).toEqual(
      expect.arrayContaining([expect.objectContaining({ role: 'user', content: 'Hello' })])
    );
  });

  it('adds user message and assistant response to history', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: 'Got it!' }),
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Book a room');
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    expect(result.current.messages[0]).toMatchObject({ role: 'user', content: 'Book a room' });
    expect(result.current.messages[1]).toMatchObject({ role: 'assistant', content: 'Got it!' });
  });

  it('resets messages to empty array when resetConversation() is called', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: 'Sure!' }),
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    act(() => {
      result.current.resetConversation();
    });

    expect(result.current.messages).toEqual([]);
  });

  it('returns loading=true while request is in flight', async () => {
    let resolveResponse;
    const pendingPromise = new Promise((resolve) => {
      resolveResponse = resolve;
    });

    vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(pendingPromise);

    const { result } = renderHook(() => useChat());

    // Before sending: not loading
    expect(result.current.loading).toBe(false);

    let sendPromise;
    act(() => {
      sendPromise = result.current.sendMessage('Hello');
    });

    // While request is in flight: loading should be true
    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    // Resolve the request
    await act(async () => {
      resolveResponse({
        ok: true,
        json: async () => ({ reply: 'Done' }),
      });
      await sendPromise;
    });

    // After request: no longer loading
    expect(result.current.loading).toBe(false);
  });

  it('sends full conversation history (all previous messages) on subsequent sends', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reply: 'First reply' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reply: 'Second reply' }),
      });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('First message');
    });

    await act(async () => {
      await result.current.sendMessage('Second message');
    });

    const secondCallBody = JSON.parse(fetch.mock.calls[1][1].body);
    // Second call should include all prior messages plus the new user message
    expect(secondCallBody.messages.length).toBeGreaterThanOrEqual(3);
    expect(secondCallBody.messages[0]).toMatchObject({ role: 'user', content: 'First message' });
    expect(secondCallBody.messages[1]).toMatchObject({ role: 'assistant', content: 'First reply' });
    expect(secondCallBody.messages[2]).toMatchObject({ role: 'user', content: 'Second message' });
  });
});

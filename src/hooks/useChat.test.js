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

// ---------------------------------------------------------------------------
// FR-CHAT-4: interactionCount increments per exchange
// ---------------------------------------------------------------------------

describe('useChat — interactionCount (FR-CHAT-4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('interactionCount starts at 0', () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.interactionCount).toBe(0);
  });

  it('interactionCount increments to 1 after one sendMessage exchange', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: 'Hello!' }),
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    await waitFor(() => {
      expect(result.current.interactionCount).toBe(1);
    });
  });

  it('interactionCount increments after each successful exchange', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reply: 'One' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reply: 'Two' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reply: 'Three' }) });

    const { result } = renderHook(() => useChat());

    for (const msg of ['First', 'Second', 'Third']) {
      await act(async () => {
        await result.current.sendMessage(msg);
      });
    }

    await waitFor(() => {
      expect(result.current.interactionCount).toBe(3);
    });
  });

  it('interactionCount resets to 0 when resetConversation() is called', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: 'Sure!' }),
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    await waitFor(() => {
      expect(result.current.interactionCount).toBe(1);
    });

    act(() => {
      result.current.resetConversation();
    });

    expect(result.current.interactionCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// FR-CHAT-4: input disabled at 10 interactions
// ---------------------------------------------------------------------------

describe('useChat — inputDisabled at session cap', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('inputDisabled is false when interactionCount is below 10', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ reply: 'OK' }),
    });

    const { result } = renderHook(() => useChat());

    // Send 9 messages
    for (let i = 0; i < 9; i++) {
      await act(async () => {
        await result.current.sendMessage(`Message ${i}`);
      });
    }

    await waitFor(() => {
      expect(result.current.interactionCount).toBe(9);
    });

    expect(result.current.inputDisabled).toBe(false);
  });

  it('inputDisabled is true when interactionCount reaches 10', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ reply: 'OK' }),
    });

    const { result } = renderHook(() => useChat());

    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await result.current.sendMessage(`Message ${i}`);
      });
    }

    await waitFor(() => {
      expect(result.current.interactionCount).toBe(10);
    });

    expect(result.current.inputDisabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// FR-CHAT-4: banner props (interactionCount exposed for InteractionBanner)
// ---------------------------------------------------------------------------

describe('useChat — banner props at warning threshold', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('interactionCount is 5 after 5 exchanges (banner should trigger)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ reply: 'OK' }),
    });

    const { result } = renderHook(() => useChat());

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await result.current.sendMessage(`Message ${i}`);
      });
    }

    await waitFor(() => {
      expect(result.current.interactionCount).toBe(5);
    });

    // At count 5, inputDisabled should still be false (only disabled at 10)
    expect(result.current.inputDisabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FR-CONF-3: conflict-resume flow — resumeWithConflict / sendConflictResume
// ---------------------------------------------------------------------------

describe('useChat — conflict-resume flow (FR-CONF-3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes a conflict-resume function (resumeWithConflict or sendConflictResume)', () => {
    const { result } = renderHook(() => useChat());
    const hasResumeFn =
      typeof result.current.resumeWithConflict === 'function' ||
      typeof result.current.sendConflictResume === 'function';
    expect(hasResumeFn).toBe(true);
  });

  it('calls /api/chat with the conflict context appended to messages', async () => {
    // First call: normal exchange so messages has history
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          assistantMessage: 'Nevada on May 10. Confirm?',
          parsedFields: {
            room_id: 'nevada',
            start_utc: '2026-05-10T06:00:00Z',
            end_utc: '2026-05-10T07:00:00Z',
            booker_name: 'Bob',
          },
          status: 'ready-to-confirm',
        }),
      })
      // Second call: LLM conflict-resume reply
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          reply: 'Alice has the room. How about 10:00?',
        }),
      });

    const { result } = renderHook(() => useChat());

    // First exchange — lands in history
    await act(async () => {
      await result.current.sendMessage('Book Nevada May 10 9am for Bob');
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    // Now trigger conflict resume
    const conflictData = {
      booker_name: 'Alice',
      room_id: 'nevada',
      start_utc: '2026-05-10T06:00:00Z',
      end_utc: '2026-05-10T07:00:00Z',
    };

    const resumeFn = result.current.resumeWithConflict ?? result.current.sendConflictResume;

    await act(async () => {
      await resumeFn(conflictData);
    });

    // Second fetch call should be to /api/chat
    const secondCall = fetch.mock.calls[1];
    expect(secondCall[0]).toBe('/api/chat');

    // Body must include a synthetic message about the conflict
    const body = JSON.parse(secondCall[1].body);
    const combinedText = body.messages.map((m) => m.content).join(' ');
    expect(combinedText).toMatch(/taken|conflict|Alice|nevada/i);
  });

  it('adds a new assistant message to history after conflict resume', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          assistantMessage: 'Confirm?',
          parsedFields: {
            room_id: 'nevada',
            start_utc: '2026-05-10T06:00:00Z',
            end_utc: '2026-05-10T07:00:00Z',
            booker_name: 'Carol',
          },
          status: 'ready-to-confirm',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ reply: 'Alice has the room. Try 10:00 instead.' }),
      });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Book Nevada May 10 for Carol');
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    const resumeFn = result.current.resumeWithConflict ?? result.current.sendConflictResume;

    await act(async () => {
      await resumeFn({
        booker_name: 'Alice',
        room_id: 'nevada',
        start_utc: '2026-05-10T06:00:00Z',
        end_utc: '2026-05-10T07:00:00Z',
      });
    });

    await waitFor(() => {
      const lastMsg = result.current.messages[result.current.messages.length - 1];
      expect(lastMsg.role).toBe('assistant');
      expect(lastMsg.content).toMatch(/alice has the room|try 10:00/i);
    });
  });

  it('does NOT reset the conversation or interactionCount after conflict resume', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ reply: 'OK' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ reply: 'Alice has it. Try 10:00.' }),
      });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Book Nevada');
    });

    await waitFor(() => expect(result.current.interactionCount).toBe(1));

    const resumeFn = result.current.resumeWithConflict ?? result.current.sendConflictResume;

    await act(async () => {
      await resumeFn({
        booker_name: 'Alice',
        room_id: 'nevada',
        start_utc: '2026-05-10T06:00:00Z',
        end_utc: '2026-05-10T07:00:00Z',
      });
    });

    await waitFor(() => expect(result.current.messages.length).toBeGreaterThanOrEqual(3));

    // Conversation not reset — interactionCount should not be 0
    expect(result.current.messages.length).toBeGreaterThan(0);
  });
});

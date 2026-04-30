/**
 * Unit tests for src/components/ChatDock/ChatDock.jsx — 409 conflict flow
 *
 * Tests the integration within ChatDock when POST /api/bookings returns 409:
 *   1. A toast message appears in the DOM with the conflicting booker's name.
 *   2. /api/chat is called again with conflict context; the LLM reply appears
 *      as a new assistant message with alternative suggestions.
 *
 * Note: ChatDock uses useHealthPoll which calls /api/health on mount.
 * We mock fetch globally and route by URL.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ChatDock from './ChatDock.jsx';

// ---------------------------------------------------------------------------
// Describe: 409 conflict flow via RTL
// ---------------------------------------------------------------------------

describe('ChatDock — 409 conflict flow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a toast with the conflicting booker name after 409 on /api/bookings', async () => {
    let chatCallCount = 0;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url.includes('/api/health')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, llmAvailable: true, dailyCapRemaining: 500 }),
        };
      }
      if (url.includes('/api/chat')) {
        chatCallCount += 1;
        if (chatCallCount === 1) {
          // First call: ready-to-confirm
          return {
            ok: true,
            status: 200,
            json: async () => ({
              assistantMessage: 'Nevada on May 10 at 9 AM. Shall I confirm?',
              parsedFields: {
                room_id: 'nevada',
                start_utc: '2026-05-10T06:00:00Z',
                end_utc: '2026-05-10T07:00:00Z',
                booker_name: 'Bob',
                description: null,
                timeAdjusted: false,
              },
              status: 'ready-to-confirm',
            }),
          };
        }
        // Second call: conflict-resolution alternatives
        return {
          ok: true,
          status: 200,
          json: async () => ({
            reply:
              'Alice has that room until 10:00. Available: 10:00–11:00, 11:00–12:00. Pick one.',
          }),
        };
      }
      if (url.includes('/api/bookings')) {
        // 409 conflict
        return {
          ok: false,
          status: 409,
          json: async () => ({
            error: 'conflict',
            conflicting: {
              booker_name: 'Alice',
              room_id: 'nevada',
              start_utc: '2026-05-10T06:00:00Z',
              end_utc: '2026-05-10T07:00:00Z',
            },
          }),
        };
      }
      throw new Error(`Unhandled fetch: ${url}`);
    });

    render(<ChatDock />);

    // Send a user message to trigger the ready-to-confirm flow
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Book Nevada May 10 9am for Bob' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
    });

    // Wait for confirm card to appear
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /confirm booking/i })).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Click Confirm booking — triggers POST /api/bookings → 409
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));
    });

    // Toast with "Alice" should appear
    await waitFor(
      () => {
        expect(screen.getByText(/Alice/)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it('shows a new assistant message with alternative suggestions after 409', async () => {
    let chatCallCount = 0;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url.includes('/api/health')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, llmAvailable: true, dailyCapRemaining: 500 }),
        };
      }
      if (url.includes('/api/chat')) {
        chatCallCount += 1;
        if (chatCallCount === 1) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              assistantMessage: 'Nevada on May 10 at 9 AM. Shall I confirm?',
              parsedFields: {
                room_id: 'nevada',
                start_utc: '2026-05-10T06:00:00Z',
                end_utc: '2026-05-10T07:00:00Z',
                booker_name: 'Carol',
                description: null,
                timeAdjusted: false,
              },
              status: 'ready-to-confirm',
            }),
          };
        }
        // Second call: conflict-resolution — verifiable text
        return {
          ok: true,
          status: 200,
          json: async () => ({
            reply: 'Alice has the room. Here are some alternatives: 10:00, 11:00.',
          }),
        };
      }
      if (url.includes('/api/bookings')) {
        return {
          ok: false,
          status: 409,
          json: async () => ({
            error: 'conflict',
            conflicting: {
              booker_name: 'Alice',
              room_id: 'nevada',
              start_utc: '2026-05-10T06:00:00Z',
              end_utc: '2026-05-10T07:00:00Z',
            },
          }),
        };
      }
      throw new Error(`Unhandled fetch: ${url}`);
    });

    render(<ChatDock />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Book Nevada May 10 9am for Carol' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send/i }));
    });

    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /confirm booking/i })).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));
    });

    // A new assistant message with alternative suggestions should appear
    await waitFor(
      () => {
        expect(screen.getByText(/alice has the room|alternatives|10:00/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });
});

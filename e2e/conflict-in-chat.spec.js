/**
 * E2E tests: Conflict-in-chat flow — FR-CONF-2, FR-CONF-3
 *
 * When POST /api/bookings returns 409 during a chat-confirm action:
 *  1. A toast appears naming the conflicting booker.
 *  2. /api/chat is called with conflict context; LLM reply appears as a new
 *     assistant message containing alternative suggestions.
 *  3. The textarea remains enabled so the conversation can continue.
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared beforeEach: health mock + navigation (matches chat-ui.spec.js pattern)
// ---------------------------------------------------------------------------

test.describe('Conflict-in-chat (FR-CONF-2 + FR-CONF-3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/health', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, llmAvailable: true, dailyCapRemaining: 500 }),
      });
    });
    await page.goto('/');
  });

  // -------------------------------------------------------------------------
  // Test 1: 409 on confirm → toast with booker name + LLM follow-up message
  // -------------------------------------------------------------------------

  test('409 on chat-confirm: shows toast with conflicting booker name and a new assistant message with alternatives', async ({
    page,
  }) => {
    // Step 1: mock /api/chat to return ready-to-confirm on first call
    let chatCallCount = 0;
    await page.route('/api/chat', (route) => {
      chatCallCount += 1;
      if (chatCallCount === 1) {
        // First call: LLM returns a confirm card
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            assistantMessage: 'Nevada on May 10 at 9 AM for 1 hour. Shall I confirm?',
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
        });
      } else {
        // Second call: LLM offers conflict alternatives
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            reply:
              'Alice has the room until 10:00. Available nearby: 10:00–11:00, 11:00–12:00. Pick one or suggest a different time.',
          }),
        });
      }
    });

    // Step 2: user sends a booking request to get the confirm card
    const textarea = page.getByRole('textbox');
    await textarea.fill('Book Nevada on May 10 at 9am for Bob');
    await page.getByRole('button', { name: /send/i }).click();

    // Wait for the confirm card to appear
    await expect(page.getByRole('button', { name: /confirm booking/i })).toBeVisible({
      timeout: 15000,
    });

    // Step 3: mock /api/bookings to return 409 conflict
    await page.route('/api/bookings', (route) => {
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'conflict',
          conflicting: {
            booker_name: 'Alice',
            room_id: 'nevada',
            start_utc: '2026-05-10T06:00:00Z',
            end_utc: '2026-05-10T07:00:00Z',
          },
        }),
      });
    });

    // Step 4: click Confirm booking — triggers the 409
    await page.getByRole('button', { name: /confirm booking/i }).click();

    // Step 5: toast containing "Alice" should appear
    await expect(page.getByText(/Alice/)).toBeVisible({ timeout: 10000 });

    // Step 6: a new assistant message with alternatives should appear in chat
    await expect(page.getByText(/available nearby|pick one|suggest a different time/i)).toBeVisible(
      { timeout: 15000 }
    );
  });

  // -------------------------------------------------------------------------
  // Test 2: after 409 the textarea is NOT disabled (conversation continues)
  // -------------------------------------------------------------------------

  test('after 409 conflict, textarea remains enabled so conversation can continue', async ({
    page,
  }) => {
    // Mock /api/chat — first call returns ready-to-confirm, second returns alternatives
    let chatCallCount = 0;
    await page.route('/api/chat', (route) => {
      chatCallCount += 1;
      if (chatCallCount === 1) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
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
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            reply: 'Alice has that slot. How about 10:00–11:00?',
          }),
        });
      }
    });

    // Mock /api/bookings to return 409
    await page.route('/api/bookings', (route) => {
      route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'conflict',
          conflicting: {
            booker_name: 'Alice',
            room_id: 'nevada',
            start_utc: '2026-05-10T06:00:00Z',
            end_utc: '2026-05-10T07:00:00Z',
          },
        }),
      });
    });

    // Get the confirm card
    const textarea = page.getByRole('textbox');
    await textarea.fill('Book Nevada on May 10 at 9am for Carol');
    await page.getByRole('button', { name: /send/i }).click();

    await expect(page.getByRole('button', { name: /confirm booking/i })).toBeVisible({
      timeout: 15000,
    });

    // Trigger the 409
    await page.getByRole('button', { name: /confirm booking/i }).click();

    // Wait for the LLM alternative message to confirm the resume happened
    await expect(page.getByText(/alice has that slot|how about/i)).toBeVisible({ timeout: 15000 });

    // Textarea must NOT be disabled — the user can continue typing
    await expect(textarea).not.toBeDisabled();
  });
});

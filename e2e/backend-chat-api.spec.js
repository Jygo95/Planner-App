/**
 * E2E test for POST /api/chat
 *
 * Hits the real endpoint. Resilient to missing ANTHROPIC_API_KEY:
 * accepts 200 (LLM responded) or 503 (graceful llm_unavailable).
 *
 * Named backend-chat-api.spec.js so the Playwright "backend" project picks
 * it up (testMatch: backend-*.spec.js, baseURL: http://localhost:3001).
 */

import { test, expect } from '@playwright/test';

test('POST /api/chat returns 200 or 503 and has correct shape', async ({ request }) => {
  const response = await request.post('/api/chat', {
    data: {
      messages: [{ role: 'user', content: 'I need a room tomorrow at 2pm for 1 hour' }],
    },
  });

  const status = response.status();

  // Accept both 200 (LLM available) and 503 (API key absent — graceful degradation)
  expect([200, 503]).toContain(status);

  if (status === 200) {
    const body = await response.json();
    expect(typeof body.assistantMessage).toBe('string');
    expect(body.assistantMessage.length).toBeGreaterThan(0);
  }
});

/**
 * Integration tests for POST /api/chat
 *
 * Mocks the LLM module so no real API calls are made.
 * Uses the same server-start pattern as bookings.test.js.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer } from 'http';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/migrations.js';

// ---------------------------------------------------------------------------
// In-memory DB (app.js imports db singleton — replace it before app loads)
// ---------------------------------------------------------------------------
const testDb = new Database(':memory:');
runMigrations(testDb);

vi.mock('../db/index.js', () => ({ default: testDb }));

// ---------------------------------------------------------------------------
// Mock the LLM module BEFORE importing app
// ---------------------------------------------------------------------------
vi.mock('../../llm/index.js', () => ({
  parseBookingRequest: vi.fn(),
  generateWittyResponse: vi.fn(),
}));

import { parseBookingRequest } from '../../llm/index.js';

// ---------------------------------------------------------------------------
// Server helpers
// ---------------------------------------------------------------------------
let app;
let server;
let port;
let BASE;

async function startServer(expressApp) {
  return new Promise((resolve) => {
    const s = createServer(expressApp);
    s.listen(0, '127.0.0.1', () => resolve({ server: s, port: s.address().port }));
  });
}

beforeAll(async () => {
  const mod = await import('../app.js');
  app = mod.app ?? mod.default;
  ({ server, port } = await startServer(app));
  BASE = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  if (server) server.close();
  testDb.close();
});

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
async function postChat(body) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

// ---------------------------------------------------------------------------
// 1. Happy path — 200 with correct shape
// ---------------------------------------------------------------------------
describe('POST /api/chat — happy path', () => {
  it('returns 200 with { assistantMessage, parsedFields, status }', async () => {
    parseBookingRequest.mockResolvedValue({
      assistantMessage: 'Sure, I can book California for you tomorrow at 2pm.',
      parsedFields: {
        room_id: 'california',
        start_utc: '2026-04-27T11:00:00.000Z',
        end_utc: '2026-04-27T12:00:00.000Z',
        booker_name: null,
      },
      status: 'ready-to-confirm',
    });

    const { status, body } = await postChat({
      messages: [{ role: 'user', content: 'Book california tomorrow 2pm' }],
    });

    expect(status).toBe(200);
    expect(typeof body.assistantMessage).toBe('string');
    expect(typeof body.parsedFields).toBe('object');
    expect(typeof body.status).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// 2. LLM error — 503 llm_unavailable
// ---------------------------------------------------------------------------
describe('POST /api/chat — LLM adapter throws', () => {
  it('returns 503 with { error: "llm_unavailable" }', async () => {
    parseBookingRequest.mockRejectedValue(new Error('API key missing'));

    const { status, body } = await postChat({
      messages: [{ role: 'user', content: 'Book a room please' }],
    });

    expect(status).toBe(503);
    expect(body.error).toBe('llm_unavailable');
  });
});

// ---------------------------------------------------------------------------
// 3. Missing messages field — 400
// ---------------------------------------------------------------------------
describe('POST /api/chat — missing messages field', () => {
  it('returns 400 when messages is not provided', async () => {
    const { status } = await postChat({ other: 'field' });

    expect(status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// 4. bookings_for_day injection (FR-LLM-1)
// ---------------------------------------------------------------------------
describe('POST /api/chat — bookings_for_day injection', () => {
  it('bookings_for_day populated when previous parsedFields has start_utc', async () => {
    // Seed a booking for 2026-05-10 so we can verify the route queries the DB
    testDb
      .prepare(
        `
      INSERT OR IGNORE INTO bookings (id, room_id, start_utc, end_utc, booker_name, description, created_at_utc)
      VALUES ('inject-test-1', 'nevada', '2026-05-10T09:00:00Z', '2026-05-10T10:00:00Z', 'Charlie', 'Weekly sync', '2026-04-26T00:00:00Z')
    `
      )
      .run();

    let capturedContextSnapshot;

    parseBookingRequest.mockImplementation(({ contextSnapshot }) => {
      capturedContextSnapshot = contextSnapshot;
      return Promise.resolve({
        assistantMessage: 'I can book that for you.',
        parsedFields: { room_id: 'nevada', start_utc: '2026-05-10T09:00:00Z' },
        status: 'ready-to-confirm',
      });
    });

    await postChat({
      messages: [
        { role: 'user', content: 'Book nevada on May 10 at 9am' },
        {
          role: 'assistant',
          content: 'Got it!',
          parsedFields: { start_utc: '2026-05-10T09:00:00Z', room_id: 'nevada' },
        },
        { role: 'user', content: 'Yes please confirm' },
      ],
    });

    expect(capturedContextSnapshot).toBeDefined();
    expect(Array.isArray(capturedContextSnapshot.bookings_for_day)).toBe(true);
    // Must have actually queried the DB — the seeded booking should appear
    expect(capturedContextSnapshot.bookings_for_day.length).toBeGreaterThan(0);
  });

  it('bookings_for_day is empty array when no start_utc in conversation history', async () => {
    let capturedContextSnapshot;

    parseBookingRequest.mockImplementation(({ contextSnapshot }) => {
      capturedContextSnapshot = contextSnapshot;
      return Promise.resolve({
        assistantMessage: 'When would you like to book?',
        parsedFields: {},
        status: 'needs-clarification',
      });
    });

    await postChat({
      messages: [{ role: 'user', content: 'I want to book a room' }],
    });

    expect(capturedContextSnapshot).toBeDefined();
    expect(capturedContextSnapshot.bookings_for_day).toEqual([]);
  });

  it('description field absent from bookings_for_day entries', async () => {
    // Seed a real booking in the in-memory DB for 2026-05-10
    testDb
      .prepare(
        `
      INSERT OR IGNORE INTO bookings (id, room_id, start_utc, end_utc, booker_name, description, created_at_utc)
      VALUES ('privacy-test-1', 'nevada', '2026-05-10T11:00:00Z', '2026-05-10T12:00:00Z', 'Bob', 'Secret project meeting', '2026-04-26T00:00:00Z')
    `
      )
      .run();

    let capturedContextSnapshot;

    parseBookingRequest.mockImplementation(({ contextSnapshot }) => {
      capturedContextSnapshot = contextSnapshot;
      return Promise.resolve({
        assistantMessage: 'Here are the bookings.',
        parsedFields: {},
        status: 'needs-clarification',
      });
    });

    await postChat({
      messages: [
        { role: 'user', content: 'Book nevada on May 10 at 1pm' },
        {
          role: 'assistant',
          content: 'Got it, May 10!',
          parsedFields: { start_utc: '2026-05-10T09:00:00Z', room_id: 'nevada' },
        },
        { role: 'user', content: 'Yes proceed' },
      ],
    });

    expect(Array.isArray(capturedContextSnapshot.bookings_for_day)).toBe(true);
    // Must have actual entries (not vacuous pass)
    expect(capturedContextSnapshot.bookings_for_day.length).toBeGreaterThan(0);

    // Privacy check: description must not appear in any entry
    for (const entry of capturedContextSnapshot.bookings_for_day) {
      expect(Object.keys(entry)).not.toContain('description');
    }
  });
});

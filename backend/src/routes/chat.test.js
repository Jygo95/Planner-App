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

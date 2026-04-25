/**
 * Integration tests for POST/GET/PATCH/DELETE /api/bookings
 *
 * Strategy: The db singleton in backend/src/db/index.js opens a file-based DB.
 * To keep tests isolated we create a temporary DB file per test suite run and
 * inject it into the app via a factory function that the bookings router is
 * expected to export or that the app accepts.
 *
 * Because the app is bootstrapped in app.js with a direct singleton import we
 * use a vi.mock to replace the db singleton with an in-memory database that
 * is fresh for this test file.  The mock must be hoisted (vi.mock is hoisted).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { createServer } from 'http';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/migrations.js';

// ---------------------------------------------------------------------------
// In-memory DB shared for all tests in this file
// ---------------------------------------------------------------------------
const testDb = new Database(':memory:');
runMigrations(testDb);

// Mock the db singleton BEFORE importing app so the router picks up testDb
vi.mock('../db/index.js', () => ({ default: testDb }));

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

// ---------------------------------------------------------------------------
// Shared test data helpers
// ---------------------------------------------------------------------------

/** Produces a future booking body whose slot is offset by `offsetHours` from
 *  a fixed base time so individual tests can avoid overlapping each other. */
function makeBookingBody(offsetHours = 0, roomId = 'california') {
  // Always well in the future — 30 days from now
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + 30);
  base.setUTCHours(10 + offsetHours, 0, 0, 0);
  const end = new Date(base.getTime() + 30 * 60 * 1000); // +30 min
  return {
    room_id: roomId,
    start_utc: base.toISOString(),
    end_utc: end.toISOString(),
    booker_name: 'Test User',
    description: 'Integration test booking',
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

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

// Wipe bookings between tests so slots don't collide
beforeEach(() => {
  testDb.prepare('DELETE FROM bookings').run();
  testDb.prepare('DELETE FROM booking_log').run();
});

// ---------------------------------------------------------------------------
// Helper: POST a booking and return { status, body }
// ---------------------------------------------------------------------------
async function postBooking(body) {
  const res = await fetch(`${BASE}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

// ---------------------------------------------------------------------------
// 1. POST /api/bookings — happy path → 201
// ---------------------------------------------------------------------------
describe('POST /api/bookings — valid body', () => {
  it('returns 201 with booking object containing required fields', async () => {
    const { status, body } = await postBooking(makeBookingBody(0));
    expect(status).toBe(201);
    expect(typeof body.id).toBe('string');
    expect(body.id.length).toBeGreaterThan(0);
    expect(body.room_id).toBe('california');
    expect(typeof body.start_utc).toBe('string');
    expect(typeof body.end_utc).toBe('string');
    expect(body.booker_name).toBe('Test User');
    expect(typeof body.created_at_utc).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// 2. POST → GET round-trip
// ---------------------------------------------------------------------------
describe('POST → GET round-trip', () => {
  it('posted booking appears in GET /api/bookings list', async () => {
    const body = makeBookingBody(1);
    const { status: postStatus, body: created } = await postBooking(body);
    expect(postStatus).toBe(201);

    // Query a window that contains the booking
    const from = new Date(created.start_utc);
    from.setUTCHours(from.getUTCHours() - 1);
    const to = new Date(created.end_utc);
    to.setUTCHours(to.getUTCHours() + 1);

    const res = await fetch(
      `${BASE}/api/bookings?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
    );
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(Array.isArray(list)).toBe(true);
    const found = list.find((b) => b.id === created.id);
    expect(found).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 3. POST with overlapping slot → 409
// ---------------------------------------------------------------------------
describe('POST /api/bookings — conflict', () => {
  it('returns 409 with error=conflict and conflicting object (no description)', async () => {
    const body = makeBookingBody(2);
    // First booking
    const first = await postBooking(body);
    expect(first.status).toBe(201);

    // Second booking overlapping the same slot
    const { status, body: errBody } = await postBooking(body);
    expect(status).toBe(409);
    expect(errBody.error).toBe('conflict');
    expect(errBody.conflicting).toBeDefined();
    expect(errBody.conflicting.room_id).toBe('california');
    expect(typeof errBody.conflicting.start_utc).toBe('string');
    expect(typeof errBody.conflicting.end_utc).toBe('string');
    expect(typeof errBody.conflicting.booker_name).toBe('string');
    // description must NOT be in the conflicting object (privacy rule)
    expect(Object.keys(errBody.conflicting)).not.toContain('description');
  });
});

// ---------------------------------------------------------------------------
// 4. POST — duration < 10 min → 400 too-short
// ---------------------------------------------------------------------------
describe('POST /api/bookings — too-short duration', () => {
  it('returns 400 with error=too-short for duration < 10 min', async () => {
    const base = new Date();
    base.setUTCDate(base.getUTCDate() + 30);
    base.setUTCHours(9, 0, 0, 0);
    const end = new Date(base.getTime() + 5 * 60 * 1000); // only 5 min
    const { status, body } = await postBooking({
      room_id: 'california',
      start_utc: base.toISOString(),
      end_utc: end.toISOString(),
      booker_name: 'Test User',
    });
    expect(status).toBe(400);
    expect(body.error).toBe('too-short');
  });
});

// ---------------------------------------------------------------------------
// 5. POST — duration > 4 hours → 400, message includes 'not allowed'
// ---------------------------------------------------------------------------
describe('POST /api/bookings — too-long duration', () => {
  it('returns 400 with message containing "not allowed" for duration > 4h', async () => {
    const base = new Date();
    base.setUTCDate(base.getUTCDate() + 30);
    base.setUTCHours(8, 0, 0, 0);
    const end = new Date(base.getTime() + 5 * 60 * 60 * 1000); // 5 hours
    const { status, body } = await postBooking({
      room_id: 'california',
      start_utc: base.toISOString(),
      end_utc: end.toISOString(),
      booker_name: 'Test User',
    });
    expect(status).toBe(400);
    // The error or message should mention "not allowed"
    const text = JSON.stringify(body).toLowerCase();
    expect(text).toContain('not allowed');
  });
});

// ---------------------------------------------------------------------------
// 6. POST — start in past → 400 start_in_past
// ---------------------------------------------------------------------------
describe('POST /api/bookings — start in past', () => {
  it('returns 400 with error=start_in_past', async () => {
    const past = new Date('2025-01-01T10:00:00.000Z');
    const pastEnd = new Date('2025-01-01T10:30:00.000Z');
    const { status, body } = await postBooking({
      room_id: 'california',
      start_utc: past.toISOString(),
      end_utc: pastEnd.toISOString(),
      booker_name: 'Test User',
    });
    expect(status).toBe(400);
    expect(body.error).toBe('start_in_past');
  });
});

// ---------------------------------------------------------------------------
// 7. POST — start > 90 days from now → 400 too-far
// ---------------------------------------------------------------------------
describe('POST /api/bookings — too far in future', () => {
  it('returns 400 with error=too-far for start > 90 days from now', async () => {
    const far = new Date();
    far.setUTCDate(far.getUTCDate() + 91);
    far.setUTCHours(10, 0, 0, 0);
    const farEnd = new Date(far.getTime() + 30 * 60 * 1000);
    const { status, body } = await postBooking({
      room_id: 'california',
      start_utc: far.toISOString(),
      end_utc: farEnd.toISOString(),
      booker_name: 'Test User',
    });
    expect(status).toBe(400);
    expect(body.error).toBe('too-far');
  });
});

// ---------------------------------------------------------------------------
// 8. PATCH /api/bookings/:id — update booker_name → 200
// ---------------------------------------------------------------------------
describe('PATCH /api/bookings/:id — update booker_name', () => {
  it('returns 200 with updated booking', async () => {
    const { body: created } = await postBooking(makeBookingBody(3));

    const res = await fetch(`${BASE}/api/bookings/${created.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booker_name: 'Updated Name' }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.id).toBe(created.id);
    expect(updated.booker_name).toBe('Updated Name');
    // Other fields preserved
    expect(updated.room_id).toBe(created.room_id);
  });
});

// ---------------------------------------------------------------------------
// 9. PATCH — conflicting slot (excluding self) → 409
// ---------------------------------------------------------------------------
describe('PATCH /api/bookings/:id — conflict excluding self', () => {
  it('returns 409 when patching to an already-booked slot', async () => {
    // Two non-overlapping bookings
    const { body: booking1 } = await postBooking(makeBookingBody(4));
    const { body: booking2 } = await postBooking(makeBookingBody(5));

    // Try to patch booking2 to overlap booking1's slot
    const res = await fetch(`${BASE}/api/bookings/${booking2.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_utc: booking1.start_utc,
        end_utc: booking1.end_utc,
      }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('conflict');
  });
});

// ---------------------------------------------------------------------------
// 10. DELETE /api/bookings/:id → 204
// ---------------------------------------------------------------------------
describe('DELETE /api/bookings/:id', () => {
  it('returns 204 on successful deletion', async () => {
    const { body: created } = await postBooking(makeBookingBody(6));

    const res = await fetch(`${BASE}/api/bookings/${created.id}`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(204);
  });
});

// ---------------------------------------------------------------------------
// 11. DELETE → GET confirms booking gone
// ---------------------------------------------------------------------------
describe('DELETE → GET confirms deletion', () => {
  it('deleted booking no longer appears in list', async () => {
    const body = makeBookingBody(7);
    const { body: created } = await postBooking(body);

    // Delete it
    const delRes = await fetch(`${BASE}/api/bookings/${created.id}`, {
      method: 'DELETE',
    });
    expect(delRes.status).toBe(204);

    // Query the same window
    const from = new Date(created.start_utc);
    from.setUTCHours(from.getUTCHours() - 1);
    const to = new Date(created.end_utc);
    to.setUTCHours(to.getUTCHours() + 1);

    const getRes = await fetch(
      `${BASE}/api/bookings?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
    );
    expect(getRes.status).toBe(200);
    const list = await getRes.json();
    const found = list.find((b) => b.id === created.id);
    expect(found).toBeUndefined();
  });
});

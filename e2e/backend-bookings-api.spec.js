/**
 * E2E tests for the Bookings API — Playwright backend project
 *
 * Uses Playwright's APIRequestContext (no browser navigation needed).
 * The backend is expected to run on http://localhost:3001 (configured in
 * playwright.config.js webServer + backend project baseURL).
 */

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a booking body whose start is offset by `offsetHours` from a
 *  fixed base 30 days in the future, so E2E tests avoid colliding with each
 *  other (and with Vitest integration tests which use different rooms/times). */
function futureBooking(offsetHours = 0, roomId = 'california') {
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + 30);
  base.setUTCHours(20 + offsetHours, 0, 0, 0); // evening slots unlikely to overlap dev runs
  const end = new Date(base.getTime() + 30 * 60 * 1000); // 30-min slot
  return {
    room_id: roomId,
    start_utc: base.toISOString(),
    end_utc: end.toISOString(),
    booker_name: 'E2E Tester',
    description: 'Playwright E2E test',
  };
}

// ---------------------------------------------------------------------------
// 1. POST → 201
// ---------------------------------------------------------------------------

test('POST /api/bookings creates a booking and returns 201', async ({ request }) => {
  const body = futureBooking(0);
  const res = await request.post(`${BASE}/api/bookings`, { data: body });
  expect(res.status()).toBe(201);

  const created = await res.json();
  expect(typeof created.id).toBe('string');
  expect(created.room_id).toBe(body.room_id);
  expect(created.booker_name).toBe(body.booker_name);
  expect(typeof created.start_utc).toBe('string');
  expect(typeof created.end_utc).toBe('string');
  expect(typeof created.created_at_utc).toBe('string');
});

// ---------------------------------------------------------------------------
// 2. POST → GET round-trip
// ---------------------------------------------------------------------------

test('GET /api/bookings returns the booking just posted', async ({ request }) => {
  const body = futureBooking(1);
  const postRes = await request.post(`${BASE}/api/bookings`, { data: body });
  expect(postRes.status()).toBe(201);
  const created = await postRes.json();

  const from = new Date(created.start_utc);
  from.setUTCMinutes(from.getUTCMinutes() - 60);
  const to = new Date(created.end_utc);
  to.setUTCMinutes(to.getUTCMinutes() + 60);

  const getRes = await request.get(
    `${BASE}/api/bookings?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
  );
  expect(getRes.status()).toBe(200);
  const list = await getRes.json();
  expect(Array.isArray(list)).toBe(true);
  const found = list.find((b) => b.id === created.id);
  expect(found).toBeDefined();
});

// ---------------------------------------------------------------------------
// 3. 409 on duplicate slot
// ---------------------------------------------------------------------------

test('POST /api/bookings returns 409 when slot is already booked', async ({ request }) => {
  const body = futureBooking(2);

  // First booking succeeds
  const first = await request.post(`${BASE}/api/bookings`, { data: body });
  expect(first.status()).toBe(201);

  // Second booking in same slot → conflict
  const second = await request.post(`${BASE}/api/bookings`, { data: body });
  expect(second.status()).toBe(409);

  const errBody = await second.json();
  expect(errBody.error).toBe('conflict');
  expect(errBody.conflicting).toBeDefined();
  expect(errBody.conflicting.room_id).toBe(body.room_id);
  // description must NOT be exposed in conflicting (privacy rule)
  expect(Object.keys(errBody.conflicting)).not.toContain('description');
});

// ---------------------------------------------------------------------------
// 4. DELETE → 204
// ---------------------------------------------------------------------------

test('DELETE /api/bookings/:id returns 204 and booking is gone', async ({ request }) => {
  const body = futureBooking(3);
  const postRes = await request.post(`${BASE}/api/bookings`, { data: body });
  expect(postRes.status()).toBe(201);
  const created = await postRes.json();

  // Delete
  const delRes = await request.delete(`${BASE}/api/bookings/${created.id}`);
  expect(delRes.status()).toBe(204);

  // Confirm gone via GET
  const from = new Date(created.start_utc);
  from.setUTCMinutes(from.getUTCMinutes() - 60);
  const to = new Date(created.end_utc);
  to.setUTCMinutes(to.getUTCMinutes() + 60);

  const getRes = await request.get(
    `${BASE}/api/bookings?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
  );
  expect(getRes.status()).toBe(200);
  const list = await getRes.json();
  const found = list.find((b) => b.id === created.id);
  expect(found).toBeUndefined();
});

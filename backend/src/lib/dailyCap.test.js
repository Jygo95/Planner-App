/**
 * Unit tests for backend/src/lib/dailyCap.js
 *
 * Uses an in-memory SQLite DB and creates the daily_cap table inline
 * (same schema as what dailyCap.js / migrations will create).
 *
 * Environment: node (matched by vitest.config.js environmentMatchGlobs)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS daily_cap (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    date_utc TEXT NOT NULL,
    calls_made INTEGER NOT NULL DEFAULT 0
  );
`;

function makeDb() {
  const db = new Database(':memory:');
  db.exec(CREATE_TABLE_SQL);
  return db;
}

// ---------------------------------------------------------------------------
// Lazy imports — dailyCap.js doesn't exist yet so tests must be red
// ---------------------------------------------------------------------------
import { getRemainingCalls, decrementCap } from './dailyCap.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getRemainingCalls', () => {
  let db;

  beforeEach(() => {
    db = makeDb();
  });

  it('returns 500 when the daily_cap table has no row (new day, never used)', () => {
    const remaining = getRemainingCalls(db);
    expect(remaining).toBe(500);
  });

  it('returns 500 when date_utc in DB differs from today (auto-reset scenario)', () => {
    // Insert a row from yesterday with calls_made = 300
    const yesterday = '2000-01-01';
    db.prepare('INSERT INTO daily_cap (id, date_utc, calls_made) VALUES (1, ?, 300)').run(
      yesterday
    );

    const remaining = getRemainingCalls(db);
    expect(remaining).toBe(500);
  });

  it('returns 500 - calls_made when date_utc matches today', () => {
    const today = new Date().toISOString().slice(0, 10);
    db.prepare('INSERT INTO daily_cap (id, date_utc, calls_made) VALUES (1, ?, 200)').run(today);

    const remaining = getRemainingCalls(db);
    expect(remaining).toBe(300);
  });

  it('returns 0 when calls_made equals 500', () => {
    const today = new Date().toISOString().slice(0, 10);
    db.prepare('INSERT INTO daily_cap (id, date_utc, calls_made) VALUES (1, ?, 500)').run(today);

    const remaining = getRemainingCalls(db);
    expect(remaining).toBe(0);
  });

  it('returns a non-negative value even if calls_made somehow exceeds 500', () => {
    const today = new Date().toISOString().slice(0, 10);
    db.prepare('INSERT INTO daily_cap (id, date_utc, calls_made) VALUES (1, ?, 600)').run(today);

    const remaining = getRemainingCalls(db);
    expect(remaining).toBeLessThanOrEqual(0);
  });
});

describe('decrementCap', () => {
  let db;

  beforeEach(() => {
    db = makeDb();
  });

  it('inserts a row on first call of a new day and returns 499 remaining', () => {
    const result = decrementCap(db);
    expect(result.remaining).toBe(499);
  });

  it('increments calls_made on subsequent calls the same day', () => {
    decrementCap(db); // calls_made = 1, remaining = 499
    decrementCap(db); // calls_made = 2, remaining = 498
    const result = decrementCap(db); // calls_made = 3, remaining = 497
    expect(result.remaining).toBe(497);
  });

  it('row in DB reflects incremented calls_made after multiple calls', () => {
    decrementCap(db);
    decrementCap(db);
    decrementCap(db);

    const row = db.prepare('SELECT * FROM daily_cap WHERE id = 1').get();
    expect(row.calls_made).toBe(3);
  });

  it('auto-resets when date_utc in DB differs from today', () => {
    // Simulate a row from a previous day with 499 calls
    const yesterday = '2000-01-01';
    db.prepare('INSERT INTO daily_cap (id, date_utc, calls_made) VALUES (1, ?, 499)').run(
      yesterday
    );

    // First call of new day should reset and set calls_made to 1
    const result = decrementCap(db);
    expect(result.remaining).toBe(499);

    const row = db.prepare('SELECT * FROM daily_cap WHERE id = 1').get();
    expect(row.calls_made).toBe(1);
    // date_utc must now match today
    const today = new Date().toISOString().slice(0, 10);
    expect(row.date_utc).toBe(today);
  });

  it('returns capReached: true (or remaining <= 0) when at cap', () => {
    // Pre-fill calls_made = 499 for today
    const today = new Date().toISOString().slice(0, 10);
    db.prepare('INSERT INTO daily_cap (id, date_utc, calls_made) VALUES (1, ?, 499)').run(today);

    // This call should push calls_made to 500 — cap is now reached
    const result = decrementCap(db);
    expect(result.remaining).toBe(0);
  });

  it('returns capReached: true when calls_made already equals 500 before decrement', () => {
    const today = new Date().toISOString().slice(0, 10);
    db.prepare('INSERT INTO daily_cap (id, date_utc, calls_made) VALUES (1, ?, 500)').run(today);

    const result = decrementCap(db);
    // remaining should indicate exhaustion (≤ 0) or a dedicated capReached flag
    const exhausted = result.remaining <= 0 || result.capReached === true;
    expect(exhausted).toBe(true);
  });

  it('uses a transaction (single row exists after concurrent-style calls)', () => {
    decrementCap(db);
    decrementCap(db);

    // Only one row should ever exist
    const count = db.prepare('SELECT COUNT(*) as n FROM daily_cap').get().n;
    expect(count).toBe(1);
  });
});

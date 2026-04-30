import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/migrations.js';
import { runPurge, scheduleRetentionJob } from './retention.js';

// Mock node-cron at the module level so no real timers fire during tests.
// vi.mock is hoisted to the top of the file by Vitest regardless of placement,
// but we declare it here explicitly for clarity.
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDb() {
  const db = new Database(':memory:');
  runMigrations(db);
  return db;
}

/**
 * Returns an ISO string that is `daysAgo` days before the reference date.
 */
function daysBeforeRef(refIso, daysAgo) {
  const d = new Date(refIso);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}

/**
 * Seed a booking row directly into the DB.
 */
function seedBooking(db, { id, room_id, start_utc, end_utc }) {
  db.prepare(
    `
    INSERT INTO bookings (id, room_id, start_utc, end_utc, booker_name, description, created_at_utc)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  ).run(id, room_id, start_utc, end_utc, 'Test User', 'Test booking', new Date().toISOString());
}

function allBookings(db) {
  return db.prepare('SELECT * FROM bookings ORDER BY id ASC').all();
}

function allLogs(db) {
  return db.prepare('SELECT * FROM booking_log ORDER BY id ASC').all();
}

// ---------------------------------------------------------------------------
// Reference timestamp used across tests (gives deterministic cutoffs)
// ---------------------------------------------------------------------------

// "now" for tests: 2026-04-30T12:00:00.000Z
const NOW_UTC = '2026-04-30T12:00:00.000Z';

// ---------------------------------------------------------------------------
// runPurge tests
// ---------------------------------------------------------------------------

describe('runPurge', () => {
  let db;

  beforeEach(() => {
    db = makeDb();
  });

  // -------------------------------------------------------------------------
  // Test 1: deletes old bookings, leaves recent ones untouched
  // -------------------------------------------------------------------------

  it('deletes bookings with end_utc < (nowUtc - 365 days) and leaves recent ones', () => {
    // Old booking 1: ended 400 days before NOW_UTC → should be deleted
    seedBooking(db, {
      id: 'old-booking-1',
      room_id: 'california',
      start_utc: daysBeforeRef(NOW_UTC, 401),
      end_utc: daysBeforeRef(NOW_UTC, 400),
    });

    // Old booking 2: ended exactly 366 days before NOW_UTC → should be deleted
    seedBooking(db, {
      id: 'old-booking-2',
      room_id: 'nevada',
      start_utc: daysBeforeRef(NOW_UTC, 367),
      end_utc: daysBeforeRef(NOW_UTC, 366),
    });

    // Recent booking: ended 10 days before NOW_UTC → should be KEPT
    seedBooking(db, {
      id: 'recent-booking',
      room_id: 'oregon',
      start_utc: daysBeforeRef(NOW_UTC, 11),
      end_utc: daysBeforeRef(NOW_UTC, 10),
    });

    runPurge(db, NOW_UTC);

    const remaining = allBookings(db);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('recent-booking');
  });

  // -------------------------------------------------------------------------
  // Test 2: booking_log has 2 auto_purge entries after purge
  // -------------------------------------------------------------------------

  it('writes exactly 2 auto_purge log entries for 2 deleted bookings', () => {
    seedBooking(db, {
      id: 'old-booking-1',
      room_id: 'california',
      start_utc: daysBeforeRef(NOW_UTC, 401),
      end_utc: daysBeforeRef(NOW_UTC, 400),
    });

    seedBooking(db, {
      id: 'old-booking-2',
      room_id: 'nevada',
      start_utc: daysBeforeRef(NOW_UTC, 367),
      end_utc: daysBeforeRef(NOW_UTC, 366),
    });

    seedBooking(db, {
      id: 'recent-booking',
      room_id: 'oregon',
      start_utc: daysBeforeRef(NOW_UTC, 11),
      end_utc: daysBeforeRef(NOW_UTC, 10),
    });

    runPurge(db, NOW_UTC);

    const logs = allLogs(db);
    expect(logs).toHaveLength(2);
    expect(logs.every((row) => row.action === 'auto_purge')).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Test 3: snapshot_json is captured BEFORE deletion
  // -------------------------------------------------------------------------

  it('snapshot_json in each log entry contains the original booking data (captured before delete)', () => {
    seedBooking(db, {
      id: 'old-booking-1',
      room_id: 'california',
      start_utc: daysBeforeRef(NOW_UTC, 401),
      end_utc: daysBeforeRef(NOW_UTC, 400),
    });

    seedBooking(db, {
      id: 'old-booking-2',
      room_id: 'nevada',
      start_utc: daysBeforeRef(NOW_UTC, 367),
      end_utc: daysBeforeRef(NOW_UTC, 366),
    });

    runPurge(db, NOW_UTC);

    const logs = allLogs(db);
    expect(logs).toHaveLength(2);

    // Each log entry has a valid snapshot with expected fields
    const loggedIds = logs.map((row) => {
      const snapshot = JSON.parse(row.snapshot_json);
      expect(snapshot).toHaveProperty('id');
      expect(snapshot).toHaveProperty('room_id');
      expect(snapshot).toHaveProperty('start_utc');
      expect(snapshot).toHaveProperty('end_utc');
      expect(snapshot).toHaveProperty('booker_name');
      return snapshot.id;
    });

    // Both deleted bookings are represented in the log
    expect(loggedIds).toContain('old-booking-1');
    expect(loggedIds).toContain('old-booking-2');

    // The bookings are gone from the bookings table
    // (confirming snapshot existed before deletion)
    const remaining = allBookings(db);
    const remainingIds = remaining.map((r) => r.id);
    expect(remainingIds).not.toContain('old-booking-1');
    expect(remainingIds).not.toContain('old-booking-2');
  });

  // -------------------------------------------------------------------------
  // Test 4: idempotency — running runPurge twice produces no duplicates
  // -------------------------------------------------------------------------

  it('running runPurge twice produces no duplicate log entries and no errors', () => {
    seedBooking(db, {
      id: 'old-booking-1',
      room_id: 'california',
      start_utc: daysBeforeRef(NOW_UTC, 401),
      end_utc: daysBeforeRef(NOW_UTC, 400),
    });

    seedBooking(db, {
      id: 'old-booking-2',
      room_id: 'nevada',
      start_utc: daysBeforeRef(NOW_UTC, 367),
      end_utc: daysBeforeRef(NOW_UTC, 366),
    });

    // First run
    expect(() => runPurge(db, NOW_UTC)).not.toThrow();
    // Second run — bookings already deleted, should be a no-op
    expect(() => runPurge(db, NOW_UTC)).not.toThrow();

    // Still exactly 2 log entries (no duplicates from second run)
    const logs = allLogs(db);
    expect(logs).toHaveLength(2);

    // No bookings remain
    expect(allBookings(db)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// scheduleRetentionJob tests
// ---------------------------------------------------------------------------

describe('scheduleRetentionJob', () => {
  // -------------------------------------------------------------------------
  // Test 5: scheduleRetentionJob is a callable function (node-cron is mocked)
  // -------------------------------------------------------------------------

  it('is a function that can be called without throwing (node-cron mocked)', () => {
    const db = makeDb();

    // scheduleRetentionJob should call cron.schedule internally without error.
    // node-cron is mocked at module level, so no real timer fires.
    expect(() => scheduleRetentionJob(db)).not.toThrow();
  });
});

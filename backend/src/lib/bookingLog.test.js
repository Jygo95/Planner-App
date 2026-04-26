import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/migrations.js';
import { appendLog } from './bookingLog.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDb() {
  const db = new Database(':memory:');
  runMigrations(db);
  return db;
}

function readLog(db) {
  return db.prepare('SELECT * FROM booking_log ORDER BY id ASC').all();
}

// A representative booking object (full shape)
const BOOKING = {
  id: 'booking-abc-123',
  room_id: 'california',
  start_utc: '2026-04-25T14:00:00.000Z',
  end_utc: '2026-04-25T15:00:00.000Z',
  booker_name: 'Alice',
  description: 'Team sync',
  created_at_utc: '2026-04-25T09:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('appendLog', () => {
  let db;

  beforeEach(() => {
    db = makeDb();
  });

  // -------------------------------------------------------------------------
  // create action
  // -------------------------------------------------------------------------

  it('inserts a row with action="create" for appendLog(db, "create", booking)', () => {
    appendLog(db, 'create', BOOKING);
    const rows = readLog(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('create');
  });

  it('create row has booking_id matching the booking id', () => {
    appendLog(db, 'create', BOOKING);
    const rows = readLog(db);
    expect(rows[0].booking_id).toBe(BOOKING.id);
  });

  it('create row snapshot_json is the full booking serialised as JSON', () => {
    appendLog(db, 'create', BOOKING);
    const rows = readLog(db);
    const parsed = JSON.parse(rows[0].snapshot_json);
    expect(parsed).toEqual(BOOKING);
  });

  it('create row has a non-empty at_utc string', () => {
    appendLog(db, 'create', BOOKING);
    const rows = readLog(db);
    expect(typeof rows[0].at_utc).toBe('string');
    expect(rows[0].at_utc.length).toBeGreaterThan(0);
    // Should parse as a valid ISO date
    expect(isNaN(new Date(rows[0].at_utc).getTime())).toBe(false);
  });

  // -------------------------------------------------------------------------
  // cancel action
  // -------------------------------------------------------------------------

  it('inserts a row with action="cancel" for appendLog(db, "cancel", booking)', () => {
    appendLog(db, 'cancel', BOOKING);
    const rows = readLog(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('cancel');
  });

  it('cancel row booking_id matches booking id', () => {
    appendLog(db, 'cancel', BOOKING);
    const rows = readLog(db);
    expect(rows[0].booking_id).toBe(BOOKING.id);
  });

  it('cancel row snapshot_json contains full booking object', () => {
    appendLog(db, 'cancel', BOOKING);
    const rows = readLog(db);
    const parsed = JSON.parse(rows[0].snapshot_json);
    expect(parsed).toEqual(BOOKING);
  });

  // -------------------------------------------------------------------------
  // edit action
  // -------------------------------------------------------------------------

  it('inserts a row with action="edit" for appendLog(db, "edit", booking)', () => {
    appendLog(db, 'edit', BOOKING);
    const rows = readLog(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('edit');
  });

  it('edit row snapshot_json is the full updated booking object', () => {
    const updated = { ...BOOKING, booker_name: 'Bob', description: 'Updated meeting' };
    appendLog(db, 'edit', updated);
    const rows = readLog(db);
    const parsed = JSON.parse(rows[0].snapshot_json);
    expect(parsed.booker_name).toBe('Bob');
    expect(parsed.description).toBe('Updated meeting');
    // All other fields still present
    expect(parsed.id).toBe(BOOKING.id);
    expect(parsed.room_id).toBe(BOOKING.room_id);
  });

  // -------------------------------------------------------------------------
  // Multiple entries accumulate
  // -------------------------------------------------------------------------

  it('accumulates multiple log entries for the same booking', () => {
    appendLog(db, 'create', BOOKING);
    appendLog(db, 'edit', { ...BOOKING, booker_name: 'Bob' });
    appendLog(db, 'cancel', { ...BOOKING, booker_name: 'Bob' });
    const rows = readLog(db);
    expect(rows).toHaveLength(3);
    expect(rows[0].action).toBe('create');
    expect(rows[1].action).toBe('edit');
    expect(rows[2].action).toBe('cancel');
  });

  it('snapshot_json includes ALL booking fields (no fields omitted)', () => {
    appendLog(db, 'create', BOOKING);
    const rows = readLog(db);
    const parsed = JSON.parse(rows[0].snapshot_json);
    const expectedKeys = Object.keys(BOOKING).sort();
    expect(Object.keys(parsed).sort()).toEqual(expectedKeys);
  });
});

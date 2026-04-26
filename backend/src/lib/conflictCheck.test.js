import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/migrations.js';
import { checkConflict } from './conflictCheck.js';

// ---------------------------------------------------------------------------
// Setup: fresh in-memory DB per test group
// ---------------------------------------------------------------------------

function makeDb() {
  const db = new Database(':memory:');
  runMigrations(db);
  return db;
}

function insertBooking(db, booking) {
  db.prepare(
    `INSERT INTO bookings (id, room_id, start_utc, end_utc, booker_name, description, created_at_utc)
     VALUES (@id, @room_id, @start_utc, @end_utc, @booker_name, @description, @created_at_utc)`
  ).run(booking);
}

// Existing booking used across tests:
// Room: california, 14:00 – 15:00 UTC on 2026-04-25
const EXISTING = {
  id: 'existing-001',
  room_id: 'california',
  start_utc: '2026-04-25T14:00:00.000Z',
  end_utc: '2026-04-25T15:00:00.000Z',
  booker_name: 'Alice',
  description: 'Planning session',
  created_at_utc: '2026-04-25T09:00:00.000Z',
};

describe('checkConflict', () => {
  let db;

  beforeEach(() => {
    db = makeDb();
    insertBooking(db, EXISTING);
  });

  // -------------------------------------------------------------------------
  // Overlapping intervals
  // -------------------------------------------------------------------------

  it('returns conflicting row when new booking completely overlaps existing', () => {
    // 13:30 – 15:30 overlaps 14:00 – 15:00
    const result = checkConflict(
      db,
      'california',
      '2026-04-25T13:30:00.000Z',
      '2026-04-25T15:30:00.000Z',
      ''
    );
    expect(result).not.toBeNull();
    expect(result.id).toBe('existing-001');
    expect(result.room_id).toBe('california');
    expect(result.start_utc).toBe(EXISTING.start_utc);
    expect(result.end_utc).toBe(EXISTING.end_utc);
    expect(result.booker_name).toBe('Alice');
  });

  it('returned conflict row has NO description field', () => {
    const result = checkConflict(
      db,
      'california',
      '2026-04-25T13:30:00.000Z',
      '2026-04-25T15:30:00.000Z',
      ''
    );
    expect(result).not.toBeNull();
    expect(Object.keys(result)).not.toContain('description');
  });

  it('returns conflicting row when new booking is fully inside existing', () => {
    // 14:15 – 14:45 is inside 14:00 – 15:00
    const result = checkConflict(
      db,
      'california',
      '2026-04-25T14:15:00.000Z',
      '2026-04-25T14:45:00.000Z',
      ''
    );
    expect(result).not.toBeNull();
    expect(result.id).toBe('existing-001');
  });

  it('returns conflicting row when new booking starts during existing', () => {
    // 14:30 – 15:30 starts inside existing 14:00 – 15:00
    const result = checkConflict(
      db,
      'california',
      '2026-04-25T14:30:00.000Z',
      '2026-04-25T15:30:00.000Z',
      ''
    );
    expect(result).not.toBeNull();
    expect(result.id).toBe('existing-001');
  });

  it('returns conflicting row when new booking ends during existing', () => {
    // 13:00 – 14:30 ends inside existing 14:00 – 15:00
    const result = checkConflict(
      db,
      'california',
      '2026-04-25T13:00:00.000Z',
      '2026-04-25T14:30:00.000Z',
      ''
    );
    expect(result).not.toBeNull();
    expect(result.id).toBe('existing-001');
  });

  // -------------------------------------------------------------------------
  // Non-overlapping intervals
  // -------------------------------------------------------------------------

  it('returns null when new booking ends before existing starts (before)', () => {
    // 12:00 – 13:00 is entirely before 14:00 – 15:00
    const result = checkConflict(
      db,
      'california',
      '2026-04-25T12:00:00.000Z',
      '2026-04-25T13:00:00.000Z',
      ''
    );
    expect(result).toBeNull();
  });

  it('returns null when new booking starts after existing ends (after)', () => {
    // 15:30 – 16:30 is entirely after 14:00 – 15:00
    const result = checkConflict(
      db,
      'california',
      '2026-04-25T15:30:00.000Z',
      '2026-04-25T16:30:00.000Z',
      ''
    );
    expect(result).toBeNull();
  });

  it('returns null for adjacent booking ending exactly when existing starts (open interval)', () => {
    // New booking ends at 14:00 — existing starts at 14:00 → [start, end) — no overlap
    const result = checkConflict(
      db,
      'california',
      '2026-04-25T13:00:00.000Z',
      '2026-04-25T14:00:00.000Z',
      ''
    );
    expect(result).toBeNull();
  });

  it('returns null for adjacent booking starting exactly when existing ends (open interval)', () => {
    // New booking starts at 15:00 — existing ends at 15:00 → no overlap
    const result = checkConflict(
      db,
      'california',
      '2026-04-25T15:00:00.000Z',
      '2026-04-25T16:00:00.000Z',
      ''
    );
    expect(result).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Different room — no conflict expected
  // -------------------------------------------------------------------------

  it('returns null when room differs even if time overlaps', () => {
    const result = checkConflict(
      db,
      'nevada',
      '2026-04-25T14:00:00.000Z',
      '2026-04-25T15:00:00.000Z',
      ''
    );
    expect(result).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Self-exclusion (PATCH scenario)
  // -------------------------------------------------------------------------

  it('returns null when excludeId matches the only conflicting booking (self-exclusion)', () => {
    // Would conflict, but we are editing that same booking
    const result = checkConflict(
      db,
      'california',
      '2026-04-25T14:00:00.000Z',
      '2026-04-25T15:00:00.000Z',
      'existing-001' // excludeId = self
    );
    expect(result).toBeNull();
  });

  it('returns conflict when a different booking overlaps and excludeId is self', () => {
    // Insert a second overlapping booking
    insertBooking(db, {
      id: 'second-001',
      room_id: 'california',
      start_utc: '2026-04-25T14:30:00.000Z',
      end_utc: '2026-04-25T15:30:00.000Z',
      booker_name: 'Bob',
      description: null,
      created_at_utc: '2026-04-25T09:01:00.000Z',
    });

    // Editing existing-001 to overlap second-001 — should detect conflict
    const result = checkConflict(
      db,
      'california',
      '2026-04-25T14:30:00.000Z',
      '2026-04-25T16:00:00.000Z',
      'existing-001' // exclude self, but second-001 still conflicts
    );
    expect(result).not.toBeNull();
    expect(result.id).toBe('second-001');
  });
});

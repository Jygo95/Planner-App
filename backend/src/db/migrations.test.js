import { describe, it, expect, beforeEach } from 'vitest';

// This import will fail (red) until backend/src/db/migrations.js is created by the Coder.
// The test exercises: tables exist, correct columns, index exists, idempotency.
let runMigrations;
let Database;

describe('migrations', () => {
  let db;

  beforeEach(async () => {
    // Dynamic imports so the test file loads even if the modules don't exist yet.
    // When modules are missing, the test suite will throw at import time → red.
    const betterSqlite = await import('better-sqlite3');
    Database = betterSqlite.default;
    const migrationsModule = await import('../../../backend/src/db/migrations.js');
    runMigrations = migrationsModule.runMigrations ?? migrationsModule.default;
    db = new Database(':memory:');
  });

  it('creates the bookings table with correct columns', () => {
    runMigrations(db);
    const cols = db
      .prepare('PRAGMA table_info(bookings)')
      .all()
      .map((c) => c.name);
    expect(cols).toContain('id');
    expect(cols).toContain('room_id');
    expect(cols).toContain('start_utc');
    expect(cols).toContain('end_utc');
    expect(cols).toContain('booker_name');
    expect(cols).toContain('description');
    expect(cols).toContain('created_at_utc');
  });

  it('creates the booking_log table with correct columns', () => {
    runMigrations(db);
    const cols = db
      .prepare('PRAGMA table_info(booking_log)')
      .all()
      .map((c) => c.name);
    expect(cols).toContain('id');
    expect(cols).toContain('at_utc');
    expect(cols).toContain('action');
    expect(cols).toContain('booking_id');
    expect(cols).toContain('snapshot_json');
  });

  it('creates the idx_bookings_room_time index', () => {
    runMigrations(db);
    const indexes = db
      .prepare('PRAGMA index_list(bookings)')
      .all()
      .map((i) => i.name);
    expect(indexes).toContain('idx_bookings_room_time');
  });

  it('is idempotent — running migrations twice does not throw', () => {
    expect(() => {
      runMigrations(db);
      runMigrations(db);
    }).not.toThrow();
  });
});

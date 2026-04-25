export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      start_utc TEXT NOT NULL,
      end_utc TEXT NOT NULL,
      booker_name TEXT NOT NULL,
      description TEXT,
      created_at_utc TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_room_time
      ON bookings (room_id, start_utc, end_utc);

    CREATE TABLE IF NOT EXISTS booking_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at_utc TEXT NOT NULL,
      action TEXT NOT NULL,
      booking_id TEXT NOT NULL,
      snapshot_json TEXT NOT NULL
    );
  `);
}

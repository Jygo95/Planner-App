/**
 * Append an entry to the booking_log table.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {'create' | 'edit' | 'cancel'} action
 * @param {object} booking Full booking object to snapshot
 */
export function appendLog(db, action, booking) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO booking_log (at_utc, action, booking_id, snapshot_json)
     VALUES (?, ?, ?, ?)`
  ).run(now, action, booking.id, JSON.stringify(booking));
}

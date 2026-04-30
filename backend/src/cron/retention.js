import cron from 'node-cron';

/**
 * Purge bookings whose end_utc is older than 365 days before nowUtc.
 * Each deleted booking is first written to booking_log with action='auto_purge'.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} [nowUtc] - ISO timestamp representing "now". Defaults to new Date().toISOString().
 */
export function runPurge(db, nowUtc) {
  const now = nowUtc ?? new Date().toISOString();

  // Compute cutoff: 365 days before now
  const cutoffDate = new Date(now);
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - 365);
  const cutoff = cutoffDate.toISOString();

  const purge = db.transaction(() => {
    const oldBookings = db.prepare('SELECT * FROM bookings WHERE end_utc < ?').all(cutoff);

    const insertLog = db.prepare(
      `INSERT INTO booking_log (at_utc, action, booking_id, snapshot_json)
       VALUES (?, 'auto_purge', ?, ?)`
    );

    const deleteBooking = db.prepare('DELETE FROM bookings WHERE id = ?');

    for (const row of oldBookings) {
      insertLog.run(now, row.id, JSON.stringify(row));
      deleteBooking.run(row.id);
    }

    return oldBookings.length;
  });

  return purge();
}

/**
 * Schedule the retention purge job to run daily at 03:00 Europe/Riga.
 *
 * @param {import('better-sqlite3').Database} db
 */
export function scheduleRetentionJob(db) {
  cron.schedule('0 3 * * *', () => runPurge(db), { timezone: 'Europe/Riga' });
}

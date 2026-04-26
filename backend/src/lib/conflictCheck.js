/**
 * Synchronous conflict check — runs inside the caller's transaction.
 * Returns the first conflicting booking row (without description) or null.
 */

/**
 * Check for a booking that overlaps [startUtc, endUtc) in the given room.
 *
 * Uses half-open interval logic: existing.start_utc < newEnd AND existing.end_utc > newStart
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} roomId
 * @param {string} startUtc ISO UTC string
 * @param {string} endUtc ISO UTC string
 * @param {string} [excludeId=''] Booking ID to exclude (for PATCH self-exclusion)
 * @returns {{ id: string, room_id: string, start_utc: string, end_utc: string, booker_name: string } | null}
 */
export function checkConflict(db, roomId, startUtc, endUtc, excludeId = '') {
  const row = db
    .prepare(
      `SELECT id, room_id, start_utc, end_utc, booker_name FROM bookings
       WHERE room_id = ? AND start_utc < ? AND end_utc > ? AND id != ?
       LIMIT 1`
    )
    .get(roomId, endUtc, startUtc, excludeId ?? '');

  return row ?? null;
}

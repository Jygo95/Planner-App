/**
 * Daily cap helpers for tracking system-wide LLM calls (FR-CHAT-5).
 * Single-row SQLite counter, resets at 00:00 UTC.
 */

const CAP = 500;

/**
 * Returns the number of remaining calls for today.
 * If no row exists or the stored date differs from today, returns CAP (auto-reset).
 * @param {import('better-sqlite3').Database} db
 * @returns {number}
 */
export function getRemainingCalls(db) {
  const today = new Date().toISOString().slice(0, 10);
  const row = db.prepare('SELECT date_utc, calls_made FROM daily_cap WHERE id = 1').get();
  if (!row || row.date_utc !== today) return CAP;
  return Math.max(0, CAP - row.calls_made);
}

/**
 * Decrements the daily cap by 1 (or resets the day counter first).
 * Returns { remaining, capReached } where remaining is the count AFTER this call.
 * If the cap was already exhausted (calls_made >= CAP), does NOT increment further
 * and returns { remaining: 0, capReached: true }.
 * Uses a transaction for thread safety.
 * @param {import('better-sqlite3').Database} db
 * @returns {{ remaining: number, capReached: boolean }}
 */
export function decrementCap(db) {
  const today = new Date().toISOString().slice(0, 10);
  return db.transaction(() => {
    const row = db.prepare('SELECT date_utc, calls_made FROM daily_cap WHERE id = 1').get();

    // New day or no row — reset to 1 call made
    if (!row || row.date_utc !== today) {
      db.prepare(
        'INSERT OR REPLACE INTO daily_cap (id, date_utc, calls_made) VALUES (1, ?, 1)'
      ).run(today);
      return { remaining: CAP - 1, capReached: false };
    }

    // Cap already exhausted — do not increment, signal exhaustion
    if (row.calls_made >= CAP) {
      return { remaining: 0, capReached: true };
    }

    const newCount = row.calls_made + 1;
    db.prepare('UPDATE daily_cap SET calls_made = ? WHERE id = 1').run(newCount);
    const remaining = Math.max(0, CAP - newCount);
    return { remaining, capReached: remaining === 0 };
  })();
}

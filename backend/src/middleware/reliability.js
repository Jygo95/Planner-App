/**
 * Backend reliability middleware (NFR-6).
 *
 * withDbRetry(fn) — retries fn up to 3× on SQLITE_BUSY with 100 ms delay.
 *   Rejects with { status: 503, error: 'db_unavailable' } if all attempts fail.
 *
 * dbBusyHandler(err, req, res, next) — Express error handler for 503 db errors.
 */

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wrap a synchronous or async DB operation function with retry logic.
 * @param {Function} fn — zero-argument function that performs the DB operation
 * @returns {Promise} resolves with fn's return value or rejects on failure
 */
export async function withDbRetry(fn) {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      // fn may be sync or async; await handles both
      return await Promise.resolve(fn());
    } catch (err) {
      if (err && err.code === 'SQLITE_BUSY') {
        attempt += 1;
        if (attempt >= MAX_RETRIES) {
          const dbError = new Error('db_unavailable');
          dbError.status = 503;
          dbError.error = 'db_unavailable';
          throw dbError;
        }
        await sleep(RETRY_DELAY_MS);
      } else {
        // Non-SQLITE_BUSY errors are re-thrown immediately
        throw err;
      }
    }
  }
}

/**
 * Express error-handler middleware for DB unavailable errors.
 * Must have 4 parameters to be recognised as error middleware by Express.
 */
export function dbBusyHandler(err, req, res, next) {
  if (err && err.status === 503 && err.error === 'db_unavailable') {
    return res.status(503).json({ error: 'db_unavailable' });
  }
  return next(err);
}

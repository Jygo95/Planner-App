/**
 * Tests for backend reliability utility (NFR-6):
 *
 * These tests are intentionally RED — the retry utility at
 * `backend/src/middleware/reliability.js` does not exist yet.
 *
 * Spec:
 *   - withDbRetry(fn) — retries fn up to 3× on SQLITE_BUSY; resolves on 3rd attempt
 *   - withDbRetry(fn) — after 3 consecutive SQLITE_BUSY errors, rejects with a
 *     503-signalling error ({ status: 503, error: 'db_unavailable' })
 */

import { describe, it, expect, vi } from 'vitest';
import { withDbRetry } from './reliability.js';

// ---------------------------------------------------------------------------
// 1. Retry succeeds on the 3rd attempt
// ---------------------------------------------------------------------------
describe('withDbRetry — succeeds on 3rd attempt', () => {
  it('resolves with the return value when the wrapped fn succeeds after 2 SQLITE_BUSY errors', async () => {
    let callCount = 0;

    function mockDbOp() {
      callCount += 1;
      if (callCount < 3) {
        const err = new Error('SQLITE_BUSY: database is locked');
        err.code = 'SQLITE_BUSY';
        throw err;
      }
      return { id: 'booking-123' };
    }

    const result = await withDbRetry(mockDbOp);

    expect(result).toEqual({ id: 'booking-123' });
    expect(callCount).toBe(3);
  });

  it('resolves immediately (1st attempt) when fn does not throw', async () => {
    let callCount = 0;

    function mockDbOp() {
      callCount += 1;
      return 'ok';
    }

    const result = await withDbRetry(mockDbOp);

    expect(result).toBe('ok');
    expect(callCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 2. Persistent SQLITE_BUSY → 503 error object
// ---------------------------------------------------------------------------
describe('withDbRetry — all attempts fail with SQLITE_BUSY → 503', () => {
  it('rejects with { status: 503, error: "db_unavailable" } after 3 SQLITE_BUSY errors', async () => {
    function alwaysBusy() {
      const err = new Error('SQLITE_BUSY: database is locked');
      err.code = 'SQLITE_BUSY';
      throw err;
    }

    await expect(withDbRetry(alwaysBusy)).rejects.toMatchObject({
      status: 503,
      error: 'db_unavailable',
    });
  });

  it('does not swallow non-SQLITE_BUSY errors — re-throws immediately', async () => {
    const originalError = new Error('Some other DB error');
    originalError.code = 'SQLITE_CONSTRAINT';

    function throwsConstraint() {
      throw originalError;
    }

    await expect(withDbRetry(throwsConstraint)).rejects.toBe(originalError);
  });
});

// ---------------------------------------------------------------------------
// 3. Express middleware integration — 503 response on persistent SQLITE_BUSY
// ---------------------------------------------------------------------------
describe('dbBusyHandler middleware — sends 503 when db_unavailable error is thrown', () => {
  it('calls res.status(503).json({ error: "db_unavailable" }) on db_unavailable error', async () => {
    const { dbBusyHandler } = await import('./reliability.js');

    const err = { status: 503, error: 'db_unavailable' };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    dbBusyHandler(err, {}, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'db_unavailable' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next(err) for non-db_unavailable errors', async () => {
    const { dbBusyHandler } = await import('./reliability.js');

    const err = new Error('Something else');

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    dbBusyHandler(err, {}, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});

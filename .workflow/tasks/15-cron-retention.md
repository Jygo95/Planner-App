# Task 15 — cron-retention

**Branch:** feat/cron-retention
**Status:** queued
**PRD refs:** FR-CRON-1, FR-CRON-2, FR-CRON-3

## Goal

node-cron job runs daily at 03:00 Europe/Riga time. Deletes bookings older than 365 days. Writes auto_purge log entry per deleted row BEFORE deleting.

## Files to create / modify

```
backend/src/
  cron/
    retention.js          # scheduleRetentionJob(db) — sets up the cron
  index.js                # (modify) call scheduleRetentionJob(db) on startup
```

## Retention job spec (FR-CRON-1)

Schedule: `'0 3 * * *'` with timezone `'Europe/Riga'` (node-cron supports tz option).

```js
import cron from 'node-cron';
export function scheduleRetentionJob(db) {
  cron.schedule('0 3 * * *', () => runPurge(db), { timezone: 'Europe/Riga' });
}
```

### `runPurge(db)` logic

```
cutoff = now_utc - 365 days (ISO string)
rows = SELECT * FROM bookings WHERE end_utc < cutoff
for each row:
  INSERT INTO booking_log (at_utc, action, booking_id, snapshot_json)
    VALUES (now_utc, 'auto_purge', row.id, JSON.stringify(row))
  DELETE FROM bookings WHERE id = row.id
```

Run inside a single transaction for atomicity. Use `db.transaction()`.

## FR-CRON-2: same process

Job runs within the Express server process. No separate worker.

## FR-CRON-3: idempotency

The criterion `end_utc < cutoff` is naturally idempotent — running twice deletes nothing the second time (already deleted). No additional deduplication needed.

## booking_log retention

The booking_log table is NEVER purged. auto_purge log entries accumulate indefinitely (as per PRD §3.3: "Retention: indefinite").

## Tests

**Vitest unit:**

1. `cron/retention.test.js`
   - `runPurge(db)` with in-memory DB containing 3 bookings: 2 older than 365d, 1 recent
   - After runPurge: 2 old bookings deleted from bookings table; 1 recent remains
   - booking_log has 2 `auto_purge` entries with full snapshot_json
   - snapshot_json captured BEFORE deletion (log entry exists even though booking is gone)
   - Idempotency: running runPurge twice → no error; no duplicate log entries; count unchanged

Note: mock `Date.now()` or pass `nowUtc` as a parameter to `runPurge` so tests can control the cutoff.

**No Playwright E2E needed** (cron job is backend-only; unit test covers correctness).

## Reviewer checklist

- [ ] FR-CRON-1: cron scheduled at 03:00 Europe/Riga (not UTC 03:00)
- [ ] FR-CRON-1: log entry written BEFORE delete (not after)
- [ ] FR-CRON-2: cron started in index.js (same process as Express)
- [ ] FR-CRON-3: naturally idempotent — no added safeguards needed beyond criterion
- [ ] booking_log NOT purged (only bookings table affected)
- [ ] Transaction wraps log write + delete atomically

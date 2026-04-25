# Task 03 — bookings-api

**Branch:** feat/bookings-api
**Status:** queued
**PRD refs:** C-4, C-7, FR-CAL-6, FR-CONF-1, FR-CONF-2, FR-LOG-1, FR-LOG-2, FR-LOG-3, FR-RULE-1–5

## Goal

Full booking CRUD with deterministic conflict check, all server-side booking rules, and append-only booking_log writes. No witty LLM text yet — rule violations return plain error messages.

## Files to create / modify

```
backend/src/
  routes/
    bookings.js         # all 4 routes; conflict check; rules validation; log writes
  lib/
    bookingRules.js     # pure functions: validateDuration, validatePast, roundToFiveMin, validateFutureLimit
    conflictCheck.js    # synchronous SQL overlap query; returns conflicting row or null
    bookingLog.js       # appendLog(db, action, booking) — writes to booking_log
  db/
    index.js            # (existing) — no change needed unless schema adds index
```

Mount `bookingsRouter` in `backend/src/index.js` at `/api/bookings`.

## API contract

### GET /api/bookings?from=ISO&to=ISO&room_id=string

Returns array of bookings whose interval overlaps [from, to]. `room_id` filter optional. Omit `description` from response? No — description IS returned here (it's not the log). Returns 200 + array.

### POST /api/bookings

Body: `{ room_id, start_utc, end_utc, booker_name, description? }`

1. Validate room_id exists in ROOMS.
2. Parse and validate start_utc / end_utc as ISO 8601 UTC.
3. Apply FR-RULE-4: round to nearest 5-min if not aligned; include `timeAdjusted: true` in response if rounded.
4. FR-RULE-3: reject if start < now (UTC). 400 `{ error: 'start is in the past' }`.
5. FR-RULE-2: reject if duration > 4 hours. 400 `{ error: 'Bookings over 4 hours are not allowed...' }`.
6. FR-RULE-1: reject if duration < 10 min. 400 `{ error: 'too-short', witty: false }` (witty text added in task 12).
7. FR-RULE-5: reject if start > now + 90 days. 400 `{ error: 'too-far', witty: false }`.
8. C-4 / FR-CONF-1: conflict check in SQLite transaction. If conflict → 409 `{ error: 'conflict', conflicting: { room_id, start_utc, end_utc, booker_name } }` (NO description per FR-LLM-4 / privacy).
9. Generate UUID id, set created_at_utc = now UTC ISO.
10. INSERT inside transaction. On success → 201 + full booking object.
11. Append `create` entry to booking_log (FR-LOG-1, FR-LOG-3).

### PATCH /api/bookings/:id

Body: partial `{ room_id?, start_utc?, end_utc?, booker_name?, description? }`
Same rules as POST (3–8) applied to merged booking. Same conflict check (exclude self). booking_log `edit` entry. Returns 200 + updated booking.

### DELETE /api/bookings/:id

Log `cancel` entry with snapshot BEFORE deletion (FR-LOG-3). Delete row. Returns 204.

## Booking rules (pure, testable)

| Rule      | Check                      | Rejection                    |
| --------- | -------------------------- | ---------------------------- |
| FR-RULE-1 | duration < 10 min          | 400 `{ error: 'too-short' }` |
| FR-RULE-2 | duration > 4 hours         | 400 plain message            |
| FR-RULE-3 | start_utc < now            | 400 plain message            |
| FR-RULE-4 | time not on 5-min boundary | round; note in response      |
| FR-RULE-5 | start_utc > now + 90 days  | 400 `{ error: 'too-far' }`   |

FR-RULE-4 rounding:

- Specific times: round to nearest 5-min mark.
- Relative/vague: round to NEXT 5-min mark (ceiling). Not applicable server-side (LLM handles vague → specific); server always receives explicit ISO.

## Conflict check SQL

```sql
SELECT id, room_id, start_utc, end_utc, booker_name FROM bookings
WHERE room_id = ? AND start_utc < ? AND end_utc > ?
  AND id != ?
LIMIT 1
```

(fourth param is empty string '' for POST, actual id for PATCH)

## booking_log entry shape

```js
{ at_utc: nowISO, action: 'create'|'edit'|'cancel', booking_id: id, snapshot_json: JSON.stringify(booking) }
```

For `cancel`: snapshot is state BEFORE deletion.

## Constraints

- C-4: conflict check MUST run inside same SQLite transaction as INSERT/UPDATE.
- C-7: booker_name stored as-is (trimmed); no auth.
- FR-LOG-2: no route reads from booking_log.
- C-3: no log endpoint.

## Tests (Tester writes these)

**Vitest unit (`backend/src/lib/*.test.js`):**

1. `bookingRules.test.js` — each rule function: valid pass, each violation type, rounding cases.
2. `conflictCheck.test.js` — overlapping interval detected; non-overlapping passes; self-exclusion for PATCH.
3. `bookingLog.test.js` — appendLog writes correct row; action values; snapshot is full JSON.

**Vitest integration (`backend/src/routes/*.test.js`):** 4. `bookings.test.js` — full route tests: POST creates; GET lists; PATCH edits; DELETE cancels; 409 on conflict; each rule violation returns correct status + error shape.

**Playwright E2E (`e2e/bookings-api.spec.js`):** 5. POST → GET round-trip; conflict 409; cancel 204.

## Reviewer checklist

- [ ] C-4: conflict check inside transaction, not separate query
- [ ] C-3 / FR-LOG-2: no route reads booking_log; no log endpoint added
- [ ] FR-LOG-3: cancel snapshot captured BEFORE delete
- [ ] 409 conflicting object has NO description field
- [ ] FR-RULE-1 returns `{ error: 'too-short' }` (not witty text — that's task 12)
- [ ] FR-RULE-5 returns `{ error: 'too-far' }` (same)
- [ ] booker_name trimmed, length ≥ 1 validated

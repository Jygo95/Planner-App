# Business Validation Log

---

## 01 — backend-skeleton — 2026-04-25

**Merge commit:** c8ef1cb
**PRD refs covered:** C-1, C-2, C-5, C-7, FR-CRON-2, NFR-6 (partial)

### Validation

- **C-1 (tech allowlist):** Express, better-sqlite3, dotenv, uuid, node-cron — all on allowlist. No unapproved packages.
- **C-2 (no data leaves backend except LLM call):** `backend/.env` gitignored; `.env.example` present with no key value. API key cannot be committed or returned to frontend.
- **C-5 (UTC storage):** bookings table stores `start_utc`, `end_utc`, `created_at_utc` as TEXT (ISO 8601). Correct foundation; time zone handling verified in future increments.
- **C-7 (booker_name as free-text):** Schema has `booker_name TEXT NOT NULL`. No auth lookup wired. Correct.
- **FR-CRON-2 (cron in same process):** Express server process established; cron job to be added in task 15 within this same process. Foundation correct.
- **NFR-6 (reliability — partial):** Health endpoint returns `ok: true`; error handler middleware present. Full reliability (SQLite retry, LLM unreachable) deferred to task 18 as specified.

### Constraints confirmed
- C-3 / FR-LOG-2: No route reads `booking_log`. No log endpoint exists. ✓
- `runMigrations` idempotent (IF NOT EXISTS). ✓
- `app` exported separately from `listen()`. ✓

### Deferrals
- NFR-6 full reliability (SQLite BUSY retry, LLM error path): task 18.
- `dailyCapRemaining` static 500: live tracking in task 13.
- `llmAvailable` static true: live check in task 09.

**Status: VALIDATED ✓**

---

## 02 — frontend-skeleton — 2026-04-25

**PRD refs covered:** FR-V-4, FR-V-5, NFR-1

### Validation

- **FR-V-4 (gear icon + settings sheet):** Gear icon present in header at all viewport widths. Settings sheet renders with three options (Auto / Force enable WebGL / Force CSS only). ✓
- **FR-V-5 (setting persistence):** `useWebGLSetting` reads and writes `localStorage` key `meeting-queuer.webgl-mode`. Default value `'auto'` when key absent. ✓
- **NFR-1 (responsive viewports):** Breakpoints tested at all 6 widths via Playwright: 430, 360, 1024, 1440, 3440, 1080. Single-column layout for < 1280px (covers mobile, tablet, and vertical monitor). Two-column at ≥ 1280px. ✓

### Constraints confirmed
- No Tailwind, no Redux, no CSS-in-JS — plain CSS throughout. ✓
- No TypeScript. ✓
- Gear icon not hidden at any breakpoint. ✓

### Deferrals
- Actual WebGL activation logic: task 16 (this task only persists the setting).
- Full visual styling (Liquid Glass): task 08.
- Chat dock and calendar area are placeholder divs only — content filled by tasks 05–10.

**Status: VALIDATED ✓**

---

## 03 — bookings-api — 2026-04-26

**Merge commit:** pending
**PRD refs covered:** C-4, C-7, FR-CAL-6, FR-CONF-1, FR-CONF-2, FR-LOG-1–3, FR-RULE-1–5

### Validation

- **C-4 (conflict check in transaction):** `checkConflict` SQL runs inside the same `db.transaction()` as INSERT/UPDATE — no TOCTOU window. Verified in `conflictCheck.js` and `bookings.js`. ✓
- **C-7 (booker_name free-text):** `booker_name` stored trimmed, no auth lookup, length ≥ 1 validated. ✓
- **FR-CONF-1 (409 shape):** Returns `{ error: 'conflict', conflicting: { id, room_id, start_utc, end_utc, booker_name } }`. No `description` field. ✓
- **FR-CONF-2 (privacy):** `checkConflict` SQL SELECT excludes `description`. Conflicting payload never exposes it. ✓
- **FR-LOG-1 (create log):** `appendLog(db, 'create', booking)` called after successful INSERT. ✓
- **FR-LOG-2 (no route reads booking_log):** No SELECT on `booking_log` anywhere in production routes. ✓
- **FR-LOG-3 (cancel snapshot before delete):** `existing` row fetched → `appendLog(db, 'cancel', existing)` → then DELETE. ✓
- **FR-RULE-1 (too-short < 10 min):** 400 `{ error: 'too-short' }`. ✓
- **FR-RULE-2 (too-long > 4 hr):** 400 `{ error: 'too-long', message: '...' }`. ✓
- **FR-RULE-3 (start in past):** 400 `{ error: 'start_in_past' }`. ✓
- **FR-RULE-4 (5-min rounding):** `roundToFiveMin` applied to start/end before persistence; `timeAdjusted: true` in response when rounding occurs. ✓
- **FR-RULE-5 (> 90 days):** 400 `{ error: 'too-far' }`. ✓

### Reviewer override rationale

Reviewer requested uppercase error codes (CONFLICT, TOO_SHORT, etc.) and 422 status for rule violations. Both contradict the task spec (`.workflow/tasks/03-bookings-api.md`) which explicitly specifies lowercase codes and 400. Tests written from spec confirm lowercase/400. Override applied per Main agent authority.

### Constraints confirmed
- No `booking_log` read endpoint. ✓
- PATCH self-exclusion uses `excludeId = id` in `checkConflict`. ✓
- All timestamps stored as ISO 8601 UTC via `.toISOString()`. ✓
- All IDs via `uuidv4()`. ✓

### Deferrals
- FR-RULE-1 witty text: task 12.
- FR-RULE-5 witty text: task 12.
- FR-CAL-6 (edit from calendar): task 07.

**Status: VALIDATED ✓**

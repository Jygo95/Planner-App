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

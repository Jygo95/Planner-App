# Current Feature

**Status:** tests-pending
**Branch:** feat/backend-skeleton
**Phase:** increment

## Spec

### Increment 01 — Backend Skeleton

Stand up the Express + SQLite backend. No LLM code; no booking CRUD.

**Files to create:**
```
backend/
  package.json          # dependencies: express, better-sqlite3, dotenv, uuid, node-cron
  .env.example          # ANTHROPIC_API_KEY=
  src/
    index.js            # Express app entry; mounts routes; runs migrations on start; port 3001
    db/
      index.js          # Opens DB at data/queuer.db, exports db instance
      migrations.js     # CREATE TABLE bookings, booking_log; index on (room_id, start_utc, end_utc); idempotent
    config/
      rooms.js          # ROOMS array (california, nevada, oregon) as in PRD §3.1
    routes/
      health.js         # GET /api/health → { ok: true, llmAvailable: true, dailyCapRemaining: 500 }
      rooms.js          # GET /api/rooms → ROOMS
    middleware/
      errorHandler.js   # Generic Express error handler
data/
  .gitkeep
```

**Repo root changes:**
- `.gitignore`: add `backend/.env` and `data/queuer.db`

**bookings table columns:** id (TEXT PK UUID), room_id (TEXT NOT NULL), start_utc (TEXT NOT NULL), end_utc (TEXT NOT NULL), booker_name (TEXT NOT NULL), description (TEXT), created_at_utc (TEXT NOT NULL)

**booking_log table columns:** id (INTEGER PK AUTOINCREMENT), at_utc (TEXT NOT NULL), action (TEXT NOT NULL), booking_id (TEXT NOT NULL), snapshot_json (TEXT NOT NULL)

**Index:** `CREATE INDEX IF NOT EXISTS idx_bookings_room_time ON bookings (room_id, start_utc, end_utc)`

**Constraints to honour:**
- C-2: `.env` gitignored, API key never committed
- C-3 / FR-LOG-2: health endpoint must NOT read booking_log; no log route exists

**PRD refs:** C-1, C-2, C-5, C-7, FR-CRON-2, NFR-6 (partial)

### Tests required (Tester writes these as failing)

**Vitest unit (`backend/src/**/*.test.js`):**
1. `db/migrations.test.js` — migrations create bookings + booking_log tables with correct columns; idempotent (safe to run twice)
2. `config/rooms.test.js` — ROOMS has exactly 3 entries; each has id, name, floor, capacity, equipment (array), notes

**Vitest integration (`backend/src/**/*.test.js`):**
3. `routes/health.test.js` — GET /api/health returns 200 + `{ ok: true, llmAvailable: true, dailyCapRemaining: 500 }`
4. `routes/rooms-route.test.js` — GET /api/rooms returns 200 + array of 3 rooms

**Playwright E2E (`e2e/`):**
5. `backend-health.spec.js` — add a second Playwright project (`baseURL: http://localhost:3001`, webServer: `node backend/src/index.js`); test navigates to `/api/health` and asserts JSON contains `"ok":true`

## State machine

- queued
- tests-pending  ← **current**
- red
- green
- review
- main-validation
- merged

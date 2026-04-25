# Task 01 — backend-skeleton

**Branch:** feat/backend-skeleton
**Status:** red (tests committed at 2c66b28)
**PRD refs:** C-1, C-2, C-5, C-7, FR-CRON-2, NFR-6

## Goal

Stand up the Express + SQLite backend process. No LLM calls, no booking CRUD.

## Files to create

```
backend/
  package.json          # type:module; deps: express, better-sqlite3, dotenv, uuid, node-cron
  .env.example          # ANTHROPIC_API_KEY=\nPORT=3001
  src/
    index.js            # Express app; mounts routes; runs migrations; exports app; listens if main module
    db/
      index.js          # opens data/queuer.db (repo-root-relative); exports db; calls runMigrations
      migrations.js     # export runMigrations(db) — CREATE TABLE IF NOT EXISTS; idempotent
    config/
      rooms.js          # export ROOMS array (see Schema)
    routes/
      health.js         # Express router: GET /api/health
      rooms.js          # Express router: GET /api/rooms
    middleware/
      errorHandler.js   # 4-arg Express error handler
data/
  .gitkeep
```

Root `.gitignore` — add if absent: `backend/.env` and `data/queuer.db`

## Schema

### ROOMS array

```js
export const ROOMS = [
  {
    id: 'california',
    name: 'California',
    floor: 1,
    capacity: 5,
    equipment: ['camera', 'tv'],
    notes: 'First room',
  },
  {
    id: 'nevada',
    name: 'Nevada',
    floor: 2,
    capacity: 8,
    equipment: ['tv', 'whiteboard', 'conference-phone'],
    notes: 'Largest room, best for client calls',
  },
  {
    id: 'oregon',
    name: 'Oregon',
    floor: 1,
    capacity: 3,
    equipment: ['whiteboard'],
    notes: 'Quiet room, no AV',
  },
];
```

### bookings table

```sql
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  start_utc TEXT NOT NULL,
  end_utc TEXT NOT NULL,
  booker_name TEXT NOT NULL,
  description TEXT,
  created_at_utc TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_room_time
  ON bookings (room_id, start_utc, end_utc);
```

### booking_log table

```sql
CREATE TABLE IF NOT EXISTS booking_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at_utc TEXT NOT NULL,
  action TEXT NOT NULL,
  booking_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL
);
```

### API responses

- `GET /api/health` → 200 `{ ok: true, llmAvailable: true, dailyCapRemaining: 500 }`
- `GET /api/rooms` → 200 `[...ROOMS]`

## Constraints

- C-2: `backend/.env` gitignored; API key never in source.
- C-3 / FR-LOG-2: health endpoint must NOT read booking_log. No log route.
- Port: `process.env.PORT || 3001`.
- DB file path: `data/queuer.db` relative to repo root (not backend/).
- ESM throughout (`"type": "module"` in backend/package.json).

## Tests that must go green (written by Tester)

1. `backend/src/db/migrations.test.js` — tables + index exist; idempotent double-run.
2. `backend/src/config/rooms.test.js` — 3 rooms, correct shape.
3. `backend/src/routes/health.test.js` — GET /api/health → 200 + correct JSON.
4. `backend/src/routes/rooms-route.test.js` — GET /api/rooms → 200 + array[3].
5. `e2e/backend-health.spec.js` (Playwright project: backend) — navigates /api/health, status 200, body.ok true.

## Reviewer checklist

- [ ] C-2: no `.env` committed, `.env.example` present
- [ ] C-3: no route reads from `booking_log`; no log endpoint exists
- [ ] FR-LOG-2: `GET /api/health` body has no log data
- [ ] `runMigrations` is idempotent (uses IF NOT EXISTS)
- [ ] `app` is exported separately from the `listen()` call (needed for test isolation)
- [ ] ESLint `node` globals cover `backend/src/**/*.js`

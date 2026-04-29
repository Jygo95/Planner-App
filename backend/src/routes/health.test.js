import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer } from 'http';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/migrations.js';

// ---------------------------------------------------------------------------
// In-memory DB shared with app for the dailyCapRemaining tests
// ---------------------------------------------------------------------------
const testDb = new Database(':memory:');
runMigrations(testDb);

vi.mock('../db/index.js', () => ({ default: testDb }));

// This import will fail (red) until backend/src/app.js (or index.js app export) is created.
// The app module must export the Express app without calling listen().
let app;
let server;
let port;

async function startServer(expressApp) {
  return new Promise((resolve) => {
    const s = createServer(expressApp);
    s.listen(0, '127.0.0.1', () => {
      resolve({ server: s, port: s.address().port });
    });
  });
}

describe('GET /api/health', () => {
  beforeAll(async () => {
    const mod = await import('../../../backend/src/app.js');
    app = mod.app ?? mod.default;
    ({ server, port } = await startServer(app));
  });

  afterAll(() => {
    if (server) server.close();
  });

  it('returns 200 with ok: true', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    expect(res.status).toBe(200);
  });

  it('returns { ok: true, llmAvailable: true, dailyCapRemaining: 500 }', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.llmAvailable).toBe(true);
    expect(body.dailyCapRemaining).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// llmAvailable reflects ANTHROPIC_API_KEY env var
// ---------------------------------------------------------------------------

describe('GET /api/health — llmAvailable reflects ANTHROPIC_API_KEY', () => {
  let localServer;
  let localPort;

  afterAll(() => {
    if (localServer) localServer.close();
  });

  it('returns llmAvailable: true when ANTHROPIC_API_KEY is set', async () => {
    // Set the env var before importing a fresh app instance
    const originalKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-present';

    try {
      // Re-import app fresh — vitest module cache may keep the old one,
      // so health.js must read process.env at request time, not module load time.
      const mod = await import('../../../backend/src/app.js');
      const localApp = mod.app ?? mod.default;
      ({ server: localServer, port: localPort } = await startServer(localApp));

      const res = await fetch(`http://127.0.0.1:${localPort}/api/health`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.llmAvailable).toBe(true);
    } finally {
      process.env.ANTHROPIC_API_KEY = originalKey;
      if (localServer) {
        localServer.close();
        localServer = null;
      }
    }
  });

  it('returns llmAvailable: false when ANTHROPIC_API_KEY is absent or empty', async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    try {
      const mod = await import('../../../backend/src/app.js');
      const localApp = mod.app ?? mod.default;
      const { server: s, port: p } = await startServer(localApp);

      const res = await fetch(`http://127.0.0.1:${p}/api/health`);
      expect(res.status).toBe(200);
      const body = await res.json();
      // The health endpoint must return false when no API key is configured
      expect(body.llmAvailable).toBe(false);

      s.close();
    } finally {
      if (originalKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      }
    }
  });
});

// ---------------------------------------------------------------------------
// dailyCapRemaining is live (not hardcoded 500) — FR-CHAT-5
// ---------------------------------------------------------------------------

describe('GET /api/health — dailyCapRemaining is live', () => {
  let liveServer;
  let livePort;

  beforeAll(async () => {
    const mod = await import('../../../backend/src/app.js');
    const liveApp = mod.app ?? mod.default;
    ({ server: liveServer, port: livePort } = await startServer(liveApp));
  });

  afterAll(() => {
    if (liveServer) liveServer.close();
  });

  it('dailyCapRemaining decreases after calls_made is incremented in the DB', async () => {
    // Ensure daily_cap table exists
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS daily_cap (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        date_utc TEXT NOT NULL,
        calls_made INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Set calls_made to 50 for today
    const today = new Date().toISOString().slice(0, 10);
    testDb
      .prepare(
        `INSERT INTO daily_cap (id, date_utc, calls_made) VALUES (1, ?, 50)
         ON CONFLICT(id) DO UPDATE SET date_utc = excluded.date_utc, calls_made = excluded.calls_made`
      )
      .run(today);

    const res = await fetch(`http://127.0.0.1:${livePort}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Must reflect DB state — NOT the hardcoded 500
    expect(body.dailyCapRemaining).toBe(450);

    // Clean up
    testDb.prepare('DELETE FROM daily_cap WHERE id = 1').run();
  });

  it('dailyCapRemaining is 500 when no row exists in daily_cap (fresh day)', async () => {
    // Ensure no row
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS daily_cap (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        date_utc TEXT NOT NULL,
        calls_made INTEGER NOT NULL DEFAULT 0
      );
    `);
    testDb.prepare('DELETE FROM daily_cap WHERE id = 1').run();

    const res = await fetch(`http://127.0.0.1:${livePort}/api/health`);
    const body = await res.json();
    expect(body.dailyCapRemaining).toBe(500);
  });
});

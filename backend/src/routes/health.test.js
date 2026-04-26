import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';

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

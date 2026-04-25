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

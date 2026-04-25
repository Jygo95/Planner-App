import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';

// This import will fail (red) until backend/src/app.js is created by the Coder.
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

describe('GET /api/rooms', () => {
  beforeAll(async () => {
    const mod = await import('../../../backend/src/app.js');
    app = mod.app ?? mod.default;
    ({ server, port } = await startServer(app));
  });

  afterAll(() => {
    if (server) server.close();
  });

  it('returns 200', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/rooms`);
    expect(res.status).toBe(200);
  });

  it('returns an array of 3 rooms', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/rooms`);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(3);
  });

  it('each room has id, name, and capacity', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/rooms`);
    const body = await res.json();
    for (const room of body) {
      expect(typeof room.id).toBe('string');
      expect(typeof room.name).toBe('string');
      expect(typeof room.capacity).toBe('number');
    }
  });
});

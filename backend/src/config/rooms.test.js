import { describe, it, expect, beforeAll } from 'vitest';

// This import will fail (red) until backend/src/config/rooms.js is created by the Coder.
let ROOMS;

describe('ROOMS config', () => {
  beforeAll(async () => {
    const mod = await import('../../../backend/src/config/rooms.js');
    ROOMS = mod.ROOMS ?? mod.default;
  });

  it('contains exactly 3 rooms', () => {
    expect(Array.isArray(ROOMS)).toBe(true);
    expect(ROOMS).toHaveLength(3);
  });

  it('contains rooms with ids: california, nevada, oregon', () => {
    const ids = ROOMS.map((r) => r.id);
    expect(ids).toContain('california');
    expect(ids).toContain('nevada');
    expect(ids).toContain('oregon');
  });

  it('each room has required fields with correct types', () => {
    for (const room of ROOMS) {
      expect(typeof room.id).toBe('string');
      expect(typeof room.name).toBe('string');
      expect(typeof room.floor).toBe('number');
      expect(typeof room.capacity).toBe('number');
      expect(Array.isArray(room.equipment)).toBe(true);
      expect(typeof room.notes).toBe('string');
    }
  });

  it('california has capacity 5 on floor 1', () => {
    const cal = ROOMS.find((r) => r.id === 'california');
    expect(cal).toBeDefined();
    expect(cal.capacity).toBe(5);
    expect(cal.floor).toBe(1);
  });

  it('nevada has capacity 8 on floor 2', () => {
    const nev = ROOMS.find((r) => r.id === 'nevada');
    expect(nev).toBeDefined();
    expect(nev.capacity).toBe(8);
    expect(nev.floor).toBe(2);
  });

  it('oregon has capacity 3 on floor 1', () => {
    const ore = ROOMS.find((r) => r.id === 'oregon');
    expect(ore).toBeDefined();
    expect(ore.capacity).toBe(3);
    expect(ore.floor).toBe(1);
  });
});

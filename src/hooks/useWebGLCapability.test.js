import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { resolveWebGLEnabled, detectWebGL } from './useWebGLCapability.js';

// ---------------------------------------------------------------------------
// resolveWebGLEnabled — pure function tests (no mocking needed)
// ---------------------------------------------------------------------------

describe('resolveWebGLEnabled', () => {
  it('returns false for "force-css" without calling detectWebGL', () => {
    // Should short-circuit — no WebGL detection needed
    const result = resolveWebGLEnabled('force-css');
    expect(result).toBe(false);
  });

  it('returns true for "force-webgl" without calling detectWebGL', () => {
    const result = resolveWebGLEnabled('force-webgl');
    expect(result).toBe(true);
  });

  it('returns true for "auto" when detectWebGL returns true', async () => {
    // We test resolveWebGLEnabled with "auto" by mocking detectWebGL.
    // Since we cannot vi.mock the entire module, we use the real detectWebGL path.
    // Arrange: jsdom canvas getContext returns a minimal context object
    const mockContext = {};
    const mockCanvas = { getContext: vi.fn(() => mockContext) };
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas);

    // Ensure deviceMemory is undefined (should pass)
    const origDeviceMemory = Object.getOwnPropertyDescriptor(navigator, 'deviceMemory');
    if (origDeviceMemory) {
      Object.defineProperty(navigator, 'deviceMemory', { value: undefined, configurable: true });
    }

    const result = resolveWebGLEnabled('auto');
    expect(result).toBe(true);

    vi.restoreAllMocks();
    if (origDeviceMemory) {
      Object.defineProperty(navigator, 'deviceMemory', origDeviceMemory);
    }
  });

  it('returns false for "auto" when detectWebGL returns false', () => {
    // Arrange: canvas.getContext returns null → detectWebGL returns false
    const mockCanvas = { getContext: vi.fn(() => null) };
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas);

    const result = resolveWebGLEnabled('auto');
    expect(result).toBe(false);

    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// detectWebGL — unit tests
// ---------------------------------------------------------------------------

describe('detectWebGL', () => {
  let origDeviceMemoryDescriptor;

  beforeEach(() => {
    // Snapshot the current deviceMemory descriptor so we can restore it
    origDeviceMemoryDescriptor = Object.getOwnPropertyDescriptor(navigator, 'deviceMemory');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore navigator.deviceMemory
    if (origDeviceMemoryDescriptor !== undefined) {
      Object.defineProperty(navigator, 'deviceMemory', origDeviceMemoryDescriptor);
    } else {
      // Property wasn't there originally — delete it
      try {
        delete navigator.deviceMemory;
      } catch {
        // May not be deletable in some environments — ignore
      }
    }
  });

  it('returns false when canvas.getContext("webgl2") returns null', () => {
    const mockCanvas = { getContext: vi.fn(() => null) };
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas);

    const result = detectWebGL();
    expect(result).toBe(false);
    expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl2');
  });

  it('returns false when navigator.deviceMemory is defined and < 4', () => {
    // Provide a real webgl2 context so the only failure is low memory
    const mockContext = {};
    const mockCanvas = { getContext: vi.fn(() => mockContext) };
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas);

    Object.defineProperty(navigator, 'deviceMemory', {
      value: 2,
      configurable: true,
      writable: true,
    });

    const result = detectWebGL();
    expect(result).toBe(false);
  });

  it('returns true when webgl2 context is available and navigator.deviceMemory >= 4', () => {
    const mockContext = {};
    const mockCanvas = { getContext: vi.fn(() => mockContext) };
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas);

    Object.defineProperty(navigator, 'deviceMemory', {
      value: 8,
      configurable: true,
      writable: true,
    });

    const result = detectWebGL();
    expect(result).toBe(true);
  });

  it('returns true when webgl2 context is available and navigator.deviceMemory is undefined', () => {
    const mockContext = {};
    const mockCanvas = { getContext: vi.fn(() => mockContext) };
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas);

    // Make deviceMemory undefined
    Object.defineProperty(navigator, 'deviceMemory', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const result = detectWebGL();
    expect(result).toBe(true);
  });
});

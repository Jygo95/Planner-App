import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import useWebGLSetting from '../hooks/useWebGLSetting';

const STORAGE_KEY = 'meeting-queuer.webgl-mode';

beforeEach(() => {
  localStorage.clear();
});

describe('useWebGLSetting', () => {
  it('returns "auto" by default when localStorage has no value', () => {
    const { result } = renderHook(() => useWebGLSetting());
    const [mode] = result.current;
    expect(mode).toBe('auto');
  });

  it('returns existing localStorage value when set', () => {
    localStorage.setItem(STORAGE_KEY, 'force-webgl');
    const { result } = renderHook(() => useWebGLSetting());
    const [mode] = result.current;
    expect(mode).toBe('force-webgl');
  });

  it('calling setMode writes to localStorage', () => {
    const { result } = renderHook(() => useWebGLSetting());
    act(() => {
      const [, setMode] = result.current;
      setMode('force-css');
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe('force-css');
  });
});

import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WebGLRefraction from './WebGLRefraction.jsx';

describe('WebGLRefraction', () => {
  let rafId;

  beforeEach(() => {
    // Mock requestAnimationFrame and cancelAnimationFrame
    rafId = 0;
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => {
      rafId += 1;
      // Do not actually schedule; just return an id
      return rafId;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a <canvas> element when enabled={true}', () => {
    render(<WebGLRefraction enabled={true} />);
    const canvas = document.querySelector('canvas');
    expect(canvas).not.toBeNull();
  });

  it('renders nothing (null) when enabled={false}', () => {
    const { container } = render(<WebGLRefraction enabled={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls cancelAnimationFrame on unmount when enabled={true}', () => {
    const { unmount } = render(<WebGLRefraction enabled={true} />);
    unmount();
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
  });
});

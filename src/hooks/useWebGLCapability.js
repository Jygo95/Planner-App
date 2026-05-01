export function detectWebGL() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) return false;
  try {
    const start = performance.now();
    // minimal trial render (just clearing is enough)
    if (typeof gl.clearColor === 'function') {
      gl.clearColor(0, 0, 0, 0);
    }
    if (typeof gl.clear === 'function') {
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    if (performance.now() - start > 50) return false;
  } catch {
    return false;
  }
  if (navigator.deviceMemory !== undefined && navigator.deviceMemory < 4) return false;
  return true;
}

export function resolveWebGLEnabled(setting) {
  if (setting === 'force-css') return false;
  if (setting === 'force-webgl') return true;
  return detectWebGL(); // 'auto'
}

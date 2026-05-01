import { useEffect, useRef } from 'react';
import './WebGLRefraction.css';

export default function WebGLRefraction({ enabled }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl = null;
    try {
      gl = canvas.getContext('webgl2') ?? null;
    } catch {
      // ignore — gl stays null
    }

    let startTime = performance.now();
    function frame() {
      if (gl) {
        try {
          const t = (performance.now() - startTime) / 1000;
          gl.clearColor((t * 0.01) % 1, 0.1, 0.2, 0.1);
          gl.clear(gl.COLOR_BUFFER_BIT);
        } catch {
          // ignore GL errors
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  if (!enabled) return null;
  return <canvas ref={canvasRef} className="webgl-refraction" />;
}

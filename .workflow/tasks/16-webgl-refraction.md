# Task 16 — webgl-refraction

**Branch:** feat/webgl-refraction
**Status:** queued
**PRD refs:** FR-V-3, FR-V-4

## Goal

WebGL2 shader-based refraction effect on the chat input panel only. Capability detection. CSS fallback on failure. Settings sheet toggle fully wired.

## Files to create / modify

```
src/
  components/ChatDock/
    WebGLRefraction.jsx       # canvas overlay for chat panel; manages WebGL lifecycle
    WebGLRefraction.css
    shaders/
      refraction.vert.js      # vertex shader source (inline JS string)
      refraction.frag.js      # fragment shader source (inline JS string)
  hooks/
    useWebGLCapability.js     # detection logic; returns { supported, enabled }
    useWebGLSetting.js        # (from task 02) wire detection + setting together
  components/ChatDock/
    ChatDock.jsx              # conditionally render WebGLRefraction vs CSS glass
```

## Capability detection (FR-V-3)

```js
export function detectWebGL() {
  // Check 1: WebGL2 supported
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) return false;

  // Check 2: trial render under 50ms
  const start = performance.now();
  // ... minimal render ...
  if (performance.now() - start > 50) return false;

  // Check 3: deviceMemory heuristic (if available)
  if (navigator.deviceMemory !== undefined && navigator.deviceMemory < 4) return false;

  return true;
}
```

## Settings integration (FR-V-4)

From localStorage `meeting-queuer.webgl-mode` (task 02):

- `'auto'`: use `detectWebGL()` result
- `'force-webgl'`: skip detection, always use WebGL (may fail gracefully if GPU rejects)
- `'force-css'`: always use CSS layer

```js
export function resolveWebGLEnabled(setting) {
  if (setting === 'force-css') return false;
  if (setting === 'force-webgl') return true;
  return detectWebGL(); // auto
}
```

## Refraction shader (minimal)

The effect: a subtle glass-distortion ripple on the chat panel background.

**Vertex shader** (standard pass-through):

```glsl
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
```

**Fragment shader** (simple refraction):

```glsl
precision mediump float;
uniform float time;
uniform vec2 resolution;
void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  float wave = sin(uv.x * 10.0 + time) * 0.005;
  vec2 distorted = uv + vec2(wave, wave);
  // Sample background colour (simplified — in practice, use texture from framebuffer)
  vec3 color = vec3(distorted, 0.5 + 0.5 * sin(time));
  gl_FragColor = vec4(color * 0.15, 0.1); // subtle overlay
}
```

The canvas is positioned absolutely over the chat panel with `pointer-events: none`. It provides a shimmer/ripple that enhances the glass effect. The CSS backdrop-filter remains active underneath.

## Graceful fallback

If WebGL initialisation throws at any point after detection (e.g., context lost):

1. Catch error silently
2. Remove/hide WebGLRefraction canvas
3. CSS glass layer takes over (always present as the base)

## NFR-4: 60fps requirement

- Animation loop uses `requestAnimationFrame`
- Cancel animation frame on component unmount
- If frame time > 33ms, consider reducing shader complexity (log warning to console, no user-visible change)

## Tests

**Vitest unit:**

1. `useWebGLCapability.test.js` — `resolveWebGLEnabled` returns false for 'force-css'; true for 'force-webgl'; calls detectWebGL for 'auto' (mock detectWebGL).
2. `detectWebGL.test.js` — mock canvas getContext: returns false when webgl2 null; returns false when deviceMemory < 4.

**Vitest / RTL:** 3. `WebGLRefraction.test.jsx` — renders canvas when enabled=true; renders null when enabled=false; cleanup cancels animation frame.

**Playwright E2E:** 4. `webgl-settings.spec.js` — open settings sheet; select 'Force CSS only'; verify WebGL canvas absent; select 'Force enable WebGL'; verify canvas present (or graceful fallback if test runner lacks WebGL).

## Reviewer checklist

- [ ] FR-V-3: WebGL only on chat panel (not whole page)
- [ ] FR-V-3: all three checks: WebGL2 support, trial render < 50ms, deviceMemory heuristic
- [ ] FR-V-3: CSS fallback active when WebGL disabled/fails — design still looks correct
- [ ] FR-V-4: settings sheet toggle wired to actual behaviour
- [ ] Canvas has `pointer-events: none` (doesn't block chat input)
- [ ] requestAnimationFrame cancelled on unmount (no memory leak)
- [ ] No new npm packages (shaders are inline JS strings)

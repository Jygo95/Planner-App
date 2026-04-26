import '@testing-library/jest-dom';

// Expose vitest's `vi` as `jest` so that @testing-library/dom can detect
// fake timers (it checks `typeof jest !== 'undefined'` before inspecting
// `setTimeout.clock`).
globalThis.jest = vi;

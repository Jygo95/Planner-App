# Current Feature

**Status:** tests-pending
**Branch:** feat/frontend-skeleton
**Phase:** increment

## Spec

### Increment 02 — Frontend Skeleton

Page shell with layout regions, responsive CSS breakpoints for all 6 viewports, gear icon in header, and settings sheet with WebGL toggle persisted to localStorage.

**Full spec:** `.workflow/tasks/02-frontend-skeleton.md`

**Summary of what to build:**
- Replace `src/App.jsx` with a layout shell: `<header>` (app name + gear icon), `<main>` (calendar area + chat dock regions)
- `src/App.css` — responsive breakpoints: `< 1280px` → single column (mobile/tablet/vertical-monitor), `≥ 1280px` → two column
- `src/components/SettingsSheet.jsx` — modal with 3 WebGL toggle options (Auto / Force WebGL / Force CSS)
- `src/components/GearIcon.jsx` — ⚙ button in header; opens SettingsSheet
- `src/hooks/useWebGLSetting.js` — reads/writes `localStorage` key `meeting-queuer.webgl-mode`; defaults to `'auto'`

**Constraints:**
- No Tailwind, no Redux, no CSS-in-JS — plain CSS only
- No TypeScript
- Gear icon visible on ALL viewports including mobile

**Tests required (Tester writes these as failing):**

Vitest / RTL:
1. `src/components/SettingsSheet.test.jsx` — renders 3 options; selecting updates localStorage; initial value read from localStorage
2. `src/components/GearIcon.test.jsx` — clicking opens SettingsSheet; clicking outside closes it
3. `src/hooks/useWebGLSetting.test.js` — returns stored value; setMode writes to localStorage; defaults to 'auto'

Playwright E2E:
4. `e2e/frontend-skeleton.spec.js` — on 6 viewports: page renders, gear icon visible, clicking gear shows settings sheet with 3 options. Use testIgnore on backend project so this test is excluded from the backend project.

## State machine

- queued
- tests-pending  ← **current**
- red
- green
- review
- main-validation
- merged

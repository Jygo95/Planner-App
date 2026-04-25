# Task 02 — frontend-skeleton

**Branch:** feat/frontend-skeleton
**Status:** queued
**PRD refs:** FR-V-4, FR-V-5, NFR-1

## Goal

Page shell with layout regions, responsive breakpoints for all 6 viewports, gear icon, and settings sheet with WebGL toggle persisted to localStorage.

## Files to create / modify

```
src/
  App.jsx               # replace scaffold; render layout shell
  App.css               # layout CSS: header, main, calendar-area, chat-dock; breakpoints
  components/
    SettingsSheet.jsx   # modal/drawer; WebGL toggle (Auto / Force WebGL / Force CSS)
    GearIcon.jsx        # ⚙ button in header; opens SettingsSheet
  hooks/
    useWebGLSetting.js  # reads/writes localStorage key; returns [mode, setMode]
```

## Layout regions (no content, just structure)

- `<header>` — app name left, gear icon right
- `<main>` — two-column on wide: calendar area (left/center) + chat dock (right/bottom on mobile)
- Chat dock is docked; visible without scroll on all viewports

## Responsive breakpoints (width-based)

| Viewport                                   | Width         | Layout                             |
| ------------------------------------------ | ------------- | ---------------------------------- |
| Mobile (iPhone, Android, vertical monitor) | < 900px       | single column, chat dock at bottom |
| Tablet                                     | 900px–1279px  | two column, chat narrower          |
| Desktop                                    | 1280px–1919px | two column standard                |
| Widescreen                                 | ≥ 1920px      | two column wider                   |

Vertical monitor (1080×1920) → treated as mobile (width 1080 < 900? No — 1080 > 900). Wait: PRD says `< 900px width → mobile layout`. 1080px wide vertical monitor = tablet layout. Check NFR-1 — PRD says "Vertical monitor (1080×1920) — uses the mobile layout." So the breakpoint for mobile must be `≤ 1080px` OR there's a separate rule. Use `< 1100px` as the mobile breakpoint to include the vertical monitor while excluding iPad (1024px wide — also < 1100). Actually iPad portrait is 1024px. Re-read NFR-1 carefully and implement such that 1080-wide vertical monitor AND 1024-wide iPad portrait both get mobile layout, while 1280+ gets desktop. Use `< 1280px → mobile/tablet layout` as the dividing line for single vs two column, with a sub-breakpoint at 768px for tighter mobile.

## localStorage key

`meeting-queuer.webgl-mode`
Values: `'auto'` (default) | `'force-webgl'` | `'force-css'`

## Settings sheet

- Triggered by gear icon (⚙) in header
- Three radio/button options: Auto, Force enable WebGL, Force CSS only
- Current value shown as selected
- Persists on change; closes on outside click or close button

## Tests (Tester writes these)

**Vitest / RTL (`src/components/*.test.jsx`):**

1. `SettingsSheet.test.jsx` — renders three options; selecting one updates localStorage; initial value read from localStorage.
2. `GearIcon.test.jsx` — clicking gear opens SettingsSheet; clicking outside closes it.
3. `useWebGLSetting.test.js` — returns stored value; setMode writes to localStorage; defaults to 'auto'.

**Playwright E2E (`e2e/`):** 4. `frontend-skeleton.spec.js` — on all 6 viewports (use Playwright `use: { viewport }` per test or parametrize): page renders, gear icon visible, clicking gear shows settings sheet with three options.

## Reviewer checklist

- [ ] Gear icon present in header on all viewport sizes including mobile
- [ ] localStorage key exactly `meeting-queuer.webgl-mode`
- [ ] Default value `auto` when key absent
- [ ] No Tailwind, no Redux, no CSS-in-JS — plain CSS only
- [ ] No TypeScript
- [ ] Breakpoints cover all 6 NFR-1 viewports

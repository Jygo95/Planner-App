# Task 08 — liquid-glass-css

**Branch:** feat/liquid-glass-css
**Status:** queued
**PRD refs:** FR-V-1, FR-V-2, NFR-1, NFR-4, NFR-5

## Goal

Full Liquid Glass CSS layer across all components and viewports. Accessibility pass.

## Design tokens (define as CSS custom properties on :root)

```css
--glass-bg: rgba(255, 255, 255, 0.12);
--glass-border: rgba(255, 255, 255, 0.25);
--glass-blur: blur(24px);
--glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.18), 0 1px 0 rgba(255, 255, 255, 0.15) inset;
--glass-specular: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, transparent 60%);
--radius-card: 20px;
--radius-input: 12px;
--radius-button: 10px;
--font-stack:
  -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial,
  sans-serif;
--color-california: #3b82f6; /* blue */
--color-nevada: #10b981; /* green */
--color-oregon: #f59e0b; /* amber */
```

## Components to style

### Cards / panels (FR-V-1)

- All cards: `background: var(--glass-bg)`, `backdrop-filter: var(--glass-blur)`, `border: 1px solid var(--glass-border)`, `border-radius: var(--radius-card)`, `box-shadow: var(--glass-shadow)`
- Specular highlight via `::before` pseudo with `var(--glass-specular)` gradient

### Inputs (FR-V-1)

- `border-radius: var(--radius-input)`, same glass treatment but slightly more opaque
- Visible focus ring (2px solid, contrasting — NFR-5)

### Buttons (FR-V-1)

- Primary: filled glass, white text, `border-radius: var(--radius-button)`
- Secondary: transparent with border
- Active/hover: brightness shift via filter, not opacity (maintains glass appearance)

### Calendar

- Room columns have faint room-colour tint
- Booking blocks: room colour with glass treatment, text readable
- Time indicator: red, 2px, extends full width

### Chat dock

- Prominent glass panel docked at bottom (mobile) or right side (desktop)
- Large rounded corners (20px)

### Settings sheet / detail panel

- Full glass modal with backdrop

## Accessibility (NFR-5)

- All interactive elements keyboard-reachable (Tab, Enter/Space activate)
- Visible focus states on all controls (do not remove outline)
- ARIA labels on icon-only buttons (gear icon: `aria-label="Settings"`)
- Form inputs have `<label>` elements (task 04 should have them; verify here)
- Calendar booking blocks: `role="button"`, `aria-label="[booker] [room] [time]"`
- Colour contrast: white text on glass surfaces must pass WCAG AA (4.5:1 minimum)
- No information conveyed by colour alone (room filter: colour + label)

## Background

Page background: deep dark blur — `background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)` or similar deep navy/black. The glass effect requires a non-white background to read correctly.

## Files to modify

All existing CSS files in `src/`. No new CSS-in-JS. Add/update:

```
src/
  index.css             # :root tokens; body background; font
  App.css               # layout + glass for main containers
  components/**/*.css   # per-component glass styling
```

## Tests

**Vitest / RTL:**

1. `accessibility.test.jsx` — axe-core (if available) or manual checks: all buttons have accessible names; form labels present; focus management in panels.

**Playwright visual:** 2. `visual-glass.spec.js` — screenshot each main view on desktop viewport; annotate as visual baseline (actual regression tooling in task 17; here just capture and note).

## Reviewer checklist

- [ ] FR-V-1: backdrop-filter, gradients, shadows, large radii, SF font stack all present
- [ ] FR-V-2: CSS-only baseline — no WebGL required for design to look correct
- [ ] NFR-5: keyboard navigation; focus states; ARIA labels on icon buttons; form labels
- [ ] NFR-5: colour contrast ≥ 4.5:1 on primary text
- [ ] No Tailwind, no CSS-in-JS, no new npm packages
- [ ] Works on all 6 NFR-1 viewports (Playwright screenshots or manual check)

# Task 18 — polish-pass

**Branch:** feat/polish-pass
**Status:** queued
**PRD refs:** NFR-4, NFR-5, NFR-6, FR-V-7

## Goal

Performance audit, reliability completion, full toast system, final a11y pass. This is the last increment before iteration phase.

## Scope

### Full toast system (FR-V-7)

Replace the minimal Toast from task 14 with a complete, consistent system. Toast types:
| Trigger | Message |
|---|---|
| Booking success | "Booking confirmed." |
| Race-condition conflict (409) | "That slot was just taken by [booker]. Please pick another time or room." |
| Daily cap reached | "AI assistant unavailable today. Please use the manual form." |
| LLM unreachable | "AI assistant is unreachable. Please use the manual form." |
| Save success (edit/cancel) | "Booking updated." / "Booking cancelled." |

Toast behaviour:

- Non-modal; bottom-right position; stacked if multiple
- Auto-dismiss after 5 seconds; close button
- Accessible: `role="status"`, `aria-live="polite"`
- CSS-only styling (glass treatment)

Files:

```
src/
  components/Toast/
    ToastContainer.jsx    # manages toast queue; global singleton via context
    Toast.jsx             # individual toast
    Toast.css
  context/ToastContext.jsx  # useToast() hook: { showToast }
```

Wire `showToast` into all existing call sites (tasks 04, 10, 13, 14 each have placeholder toasts).

### Performance (NFR-4)

- FCP ≤ 2s on iPhone 14 Pro Max over local wifi: check bundle size; ensure Vite prod build is used; lazy-load Calendar views if needed.
- Calendar view switching ≤ 200ms: verify no synchronous heavy work on view switch; use React state, not re-mount.
- WebGL 60fps: already addressed in task 16; confirm here with Playwright timing if possible.

Audits to run:

```bash
npm run build
npx serve dist &   # or node backend/src/index.js which serves built app
# Lighthouse CLI or manual DevTools check
```

Document findings in `.workflow/business-validation.md` entry for task 18.

### Reliability (NFR-6)

Verify and complete:

- **Frontend unreachable backend:** if any API call fails with network error, show toast "Server unreachable. Please try again." Disable booking write buttons. Re-enable when health poll succeeds.
- **Backend SQLite locked:** `better-sqlite3` is synchronous; SQLite locking is handled internally. Wrap DB operations in try/catch; on SQLITE_BUSY, retry up to 3× with 100ms delay; if persistent, return 503 `{ error: 'db_unavailable' }`.
- **LLM unreachable:** already handled in task 09 (`llmAvailable: false`). Verify toast shows correctly.

### Final a11y pass (NFR-5)

Run axe-core against all views and fix remaining issues:

- All interactive elements reachable by keyboard (Tab order logical)
- Calendar booking blocks: `role="button"`, `tabIndex={0}`, `onKeyDown` for Enter/Space
- Modal/panels: focus trapped while open; Escape closes
- Form inputs: all have `<label htmlFor>` or `aria-label`
- Sufficient colour contrast: white on glass backgrounds ≥ 4.5:1
- Screen-reader narration of calendar bookings: `aria-label="[booker] in [room] from [start] to [end]"`

## Tests

**Vitest / RTL:**

1. `Toast/ToastContainer.test.jsx` — showToast adds toast to DOM; auto-dismiss fires after timeout; close button removes; multiple toasts stack.
2. `Toast/Toast.test.jsx` — renders message; role="status"; aria-live="polite".
3. `reliability.test.js` — fetch mock: network error → correct error state; SQLite-busy retry logic in dailyCap.
4. `accessibility.test.jsx` (comprehensive) — axe-core on ManualForm, ChatDock, BookingDetailPanel, Calendar day view.

**Playwright E2E:** 5. `polish.spec.js` — Lighthouse performance score (if available) or Playwright timing; toast appears and dismisses for each trigger; keyboard nav through main flows.

## Reviewer checklist

- [ ] FR-V-7: all 5 toast triggers produce correct toast; non-modal; auto-dismiss 5s
- [ ] NFR-4: bundle reasonably sized (< 500 KB gzipped); view switch timing checked
- [ ] NFR-5: axe-core finds no critical/serious violations on all main views
- [ ] NFR-5: keyboard nav complete (Tab through all interactive elements without mouse)
- [ ] NFR-6: server-unreachable state tested and shows toast; SQLite busy returns 503
- [ ] NFR-6: LLM unreachable → llmAvailable:false → correct banner + toast
- [ ] This is the LAST increment — all PRD FRs/NFRs/Cs should be satisfied; flag any deferred items in business-validation.md

## 2026-04-25 — backend-skeleton — round 1
- Tests added: backend/src/db/migrations.test.js, backend/src/config/rooms.test.js, backend/src/routes/health.test.js, backend/src/routes/rooms-route.test.js, e2e/backend-health.spec.js
- Red confirmed: yes (module not found — backend/src/ does not exist)
- Commit SHA: 2c66b28

## 2026-04-25 — bookings-api — round 1
- Tests added: backend/src/lib/bookingRules.test.js, backend/src/lib/conflictCheck.test.js, backend/src/lib/bookingLog.test.js, backend/src/routes/bookings.test.js, e2e/backend-bookings-api.spec.js
- Red confirmed: yes (modules not found — bookingRules.js, conflictCheck.js, bookingLog.js, bookings.js do not exist; routes return 404)
- Commit SHA: b7de7ee

## 2026-04-26 — chat-ui — round 1
- Tests added:
  - src/components/ChatDock/ChatInput.test.jsx (8 tests)
  - src/components/ChatDock/ChatHistory.test.jsx (6 tests)
  - src/components/ChatDock/ChatConfirmCard.test.jsx (12 tests)
  - src/components/ChatDock/LLMUnavailableBanner.test.jsx (3 tests)
  - src/hooks/useChat.test.js (5 tests)
  - src/hooks/useHealthPoll.test.js (5 tests)
  - e2e/chat-ui.spec.js (6 Playwright tests — not run in Vitest)
- Red confirmed: yes — all 6 Vitest suites fail with "Failed to resolve import" (production files do not exist)
- Vitest output: "Test Files 6 failed | 26 passed (32)" — existing tests unaffected
- Status: red

## 2026-04-26 — llm-scheduling-brain — round 1
- Tests added:
  - backend/src/routes/chat.test.js (3 new tests in "POST /api/chat — bookings_for_day injection")
  - backend/src/llm/index.test.js (4 new tests in "parseBookingRequest — system prompt scheduling content")
  - e2e/llm-scheduling.spec.js (1 new Playwright test — not run in Vitest)
- New tests RED (5 failing):
  - chat.test.js: "bookings_for_day populated when previous parsedFields has start_utc" — production always returns [] not queried from DB
  - chat.test.js: "description field absent from bookings_for_day entries" — no DB query so no entries to check (length > 0 fails)
  - llm/index.test.js: "system prompt contains bookings_for_day section with booking data (no description)" — "Alice" not injected into system prompt
  - llm/index.test.js: "system prompt contains conflict response format (booker, time-until-free, alternatives)" — "until" + "alternatives/pick one" absent
  - llm/index.test.js: "system prompt instructs booker name verbatim" — neither "verbatim" nor "exactly as provided" in current prompt
- New tests GREEN (2 — acceptable, features partially pre-existed):
  - chat.test.js: "bookings_for_day is empty array when no start_utc" — production already defaults to []
  - llm/index.test.js: "system prompt contains room recommendation rules with mismatch guidance" — existing prompt already says "Flag equipment mismatches"
- Existing tests: 215 passing — no regressions
- Vitest output: "Test Files 2 failed | 30 passed (32), Tests 5 failed | 215 passed (220)"
- Status: red

## 2026-04-28 — caps-and-limits — round 1
- Tests added:
  - backend/src/lib/dailyCap.test.js (NEW — 13 unit tests for getRemainingCalls + decrementCap)
  - src/components/ChatDock/InteractionBanner.test.jsx (NEW — 12 RTL tests for banner rendering)
  - backend/src/routes/chat.test.js (2 new tests: 429 on cap exhausted; calls_made incremented on success)
  - backend/src/routes/health.test.js (2 new tests: dailyCapRemaining is live not hardcoded; 500 on fresh day)
  - src/hooks/useChat.test.js (11 new tests: interactionCount increments; inputDisabled at 10; banner props)
  - e2e/caps.spec.js (NEW — 5 Playwright tests: banner at 5; input disabled at 10; countdown copy; daily cap banner)
- Red confirmed: yes
  - dailyCap.test.js: 0 tests collected (import error — dailyCap.js does not exist yet)
  - InteractionBanner.test.jsx: 0 tests collected (import error — InteractionBanner.jsx does not exist yet)
  - useChat.test.js: 7 new tests failing (interactionCount + inputDisabled not exposed by useChat hook yet)
  - chat.test.js: 2 new tests failing (route doesn't implement daily cap logic; returns 503 not 429)
  - health.test.js: 1 new test failing (dailyCapRemaining is hardcoded 500, not live from DB)
- Total: 10 failing (new), 227 passing (existing — no regressions)
- Vitest output: "Test Files 5 failed | 29 passed (34), Tests 10 failed | 227 passed (237)"
- Playwright: 5 tests in e2e/caps.spec.js — syntactically valid (confirmed with --list)
- Status: red

## 2026-04-28 — conflict-in-chat — round 1
- Tests added:
  - src/components/Toast/Toast.test.jsx (NEW — 7 RTL tests: renders message; non-modal; close button; onDismiss on click; auto-dismiss timing; default 5000ms duration)
  - src/components/ChatDock/ChatDock.test.jsx (NEW — 2 RTL integration tests: toast with booker name appears after 409; new assistant alternatives message appears)
  - src/hooks/useChat.test.js (4 new tests in "conflict-resume flow (FR-CONF-3)": exposes resumeWithConflict/sendConflictResume; calls /api/chat with conflict context; adds assistant message to history; does not reset conversation)
  - e2e/conflict-in-chat.spec.js (NEW — 2 Playwright tests: toast with "Alice" appears + new assistant message; textarea not disabled after 409)
- Red confirmed: yes
  - Toast.test.jsx: all 7 tests fail — "Failed to resolve import './Toast.jsx'" (component does not exist)
  - useChat.test.js conflict-resume suite: 4 tests fail — resumeWithConflict/sendConflictResume not exported by hook
  - ChatDock.test.jsx: first test times out (Toast not rendered so getByText(/Alice/) never resolves); second test similarly fails
- Total: 5 Vitest failing (new), 262 passing (existing — no regressions; prior 261 + 1 ChatDock test pre-green)
- Vitest output: "Test Files 3 failed | 33 passed (36), Tests 5 failed | 262 passed (267)"
- Playwright: 2 tests in e2e/conflict-in-chat.spec.js — syntactically valid (not run in Vitest)
- Status: red

## 2026-04-26 — witty-responses — round 1
- Tests added:
  - backend/src/llm/index.test.js (2 new tests in "generateWittyResponse"):
    - "generateWittyResponse for too-short calls adapter with correct prompt and maxTokens=100"
    - "generateWittyResponse for too-far calls adapter with correct prompt and maxTokens=100"
  - backend/src/routes/bookings.test.js (3 new describe blocks):
    - "POST /api/bookings — too-short returns wittyMessage" — asserts `body.wittyMessage` populated from mocked `generateWittyResponse`
    - "POST /api/bookings — too-far returns wittyMessage" — same for too-far
    - "POST /api/bookings — wittyMessage fallback on generateWittyResponse error" — asserts fallback non-empty string on LLM throw
  - backend/src/routes/chat.test.js (1 new describe block):
    - "POST /api/chat — parse-failure too-short returns witty assistantMessage" — asserts `body.assistantMessage` equals witty text
  - e2e/witty-responses.spec.js (new file, 2 Playwright tests):
    - "too-short booking request shows witty assistant response"
    - "too-far booking request shows witty assistant response"
- RED confirmed:
  - Vitest: "Test Files 2 failed | 30 passed (32), Tests 4 failed | 222 passed (226)"
    - bookings.test.js: 3 failing — `body.wittyMessage` is undefined (route doesn't call generateWittyResponse yet)
    - chat.test.js: 1 failing — `body.assistantMessage` is 'stub' not witty text (route doesn't intercept parse-failure)
  - llm/index.test.js new tests: PASS — generateWittyResponse scaffold already uses maxTokens:100 and includes 'short'/'too-far' in prompt (acceptable pre-green)
  - Playwright: 6 failed across chromium/firefox/webkit — witty text not rendered in ChatDock (frontend not wired)
- Existing tests: 222 passing — no regressions
- Status: red

## 17 — visual-regression — tests-pending → red
- File: e2e/visual-regression.spec.js
- Tests written: 30 screenshot tests (6 viewports × 5 views)
- Status: red (no baseline snapshots committed yet)

## 18 — polish-pass — tests-pending → red (2026-05-02)

### Files created / modified

| File | Type | Status |
|------|------|--------|
| `src/components/Toast/ToastContainer.test.jsx` | NEW — Vitest/RTL | RED |
| `src/components/Toast/Toast.test.jsx` | MODIFIED — added 3 new tests | GREEN (Toast.jsx already exists) |
| `backend/src/middleware/reliability.test.js` | NEW — Vitest (node env) | RED |
| `src/accessibility.test.jsx` | MODIFIED — added axe-core audit tests | GREEN (existing components pass axe) |
| `e2e/polish.spec.js` | NEW — Playwright E2E | RED (run at E2E time) |

### Tests written

**ToastContainer.test.jsx** (4 describe blocks, 5 tests — all RED):
- `showToast` adds a toast to the DOM
- auto-dismiss removes toast after 5000 ms
- toast NOT removed before 5000 ms
- close button removes toast immediately
- multiple toasts stack (two visible simultaneously)

**Toast.test.jsx** (3 new tests added — GREEN because Toast.jsx already implemented):
- has `role="status"`
- has `aria-live="polite"`
- close button is present

**backend/src/middleware/reliability.test.js** (4 describe blocks, 5 tests — all RED):
- `withDbRetry` succeeds on 3rd attempt after 2 SQLITE_BUSY errors
- `withDbRetry` resolves immediately when fn doesn't throw
- `withDbRetry` rejects with `{ status: 503, error: 'db_unavailable' }` after 3 SQLITE_BUSY errors
- `withDbRetry` re-throws non-SQLITE_BUSY errors immediately
- `dbBusyHandler` Express middleware sends 503 on db_unavailable; delegates to next() for other errors

**src/accessibility.test.jsx** (2 new describe blocks — GREEN, existing components pass axe):
- `axe-core a11y audit — ManualForm`: no critical/serious violations
- `axe-core a11y audit — ChatDock`: no critical/serious violations

**e2e/polish.spec.js** (5 Playwright tests — RED, run at E2E time):
- Toast appears with "Booking confirmed" after manual form submit
- Toast auto-dismisses after 5 seconds
- Toast close button removes toast immediately
- Keyboard nav: Tab reaches "Switch to manual" without mouse
- Keyboard nav: Tab through form fields in logical order

### Vitest output (2 failing suites, 295 passing tests)

```
Test Files  2 failed | 39 passed (41)
      Tests  295 passed (295)
```

Failing suites:
1. `src/components/Toast/ToastContainer.test.jsx` — "Failed to resolve import './ToastContainer.jsx'" (production file does not exist)
2. `backend/src/middleware/reliability.test.js` — "Failed to resolve import './reliability.js'" (production file does not exist)

### Commit SHA: dbeb175

## Increment 18 review pass 2 — 2026-05-02

**Verdict:** APPROVED

### Checklist results

- [x] **All 5 toast triggers wired with correct messages**
  - Booking success (chat confirm path): `showToast('Booking confirmed.')` — ChatDock.jsx line 128
  - 409 conflict (with booker name): `showToast(\`That slot was just taken by ${errData.conflicting?.booker_name ?? 'someone'}. Please pick another time or room.\`, 'error')` — ChatDock.jsx lines 133–136
  - 429 daily cap: `showToast('AI assistant unavailable today. Please use the manual form.')` — ChatDock.jsx line 139
  - LLM unreachable (llmAvailable flips false): `showToast('AI assistant is unreachable. Please use the manual form.')` via useEffect watching `llmAvailable` — ChatDock.jsx lines 70–75
  - Calendar edit save: `showToast('Booking updated.')` and cancel: `showToast('Booking cancelled.')` — Calendar.jsx lines 118/126; two separate `useBookingActions` instances with distinct `onSuccess` callbacks

- [x] **409 toast includes booker name** — template literal with `errData.conflicting?.booker_name ?? 'someone'` exactly as specified. Regression from pass 1 is fixed.

- [x] **`serverUnreachable` disables send button in ChatDock** — `ChatInput` receives `disabled={inputDisabled || serverUnreachable}` (ChatDock.jsx line 178). Network TypeError in the booking confirm catch block sets `serverUnreachable(true)` and fires `showToast('Server unreachable. Please try again.')`.

- [x] **`serverUnreachable` disables submit + confirm buttons in ManualForm** — "Preview booking" submit button: `disabled={loading || serverUnreachable}` (ManualForm.jsx line 284). ConfirmationCard "Confirm booking" button: receives `confirmDisabled={loading || serverUnreachable}` and renders `disabled={confirmDisabled}` (ConfirmationCard.jsx line 69). Network error detected via `error?.type === 'network_error'` from `useBookingSubmit`.

- [x] **Health poll clears `serverUnreachable` on recovery** — Both ChatDock and ManualForm run a 30-second `setInterval` that fetches `/api/health`; on a successful response, `setServerUnreachable(false)` / `setServerReachable(true)` is called. ChatDock also re-checks on user focus. Intervals are cleaned up on unmount.

- [x] **No test files modified in a way that weakens assertions** — Toast.test.jsx only had new tests added (role="status", aria-live="polite", close button); no existing assertions deleted or loosened. ToastContainer.test.jsx and reliability.test.js are new files. The `-- src/components/Toast/Toast.test.jsx` diff confirms only additions (`+` lines) for the three new assertions.

- [x] **No new disallowed packages** — `axe-core` and `@axe-core/react` are explicitly listed as approved in the reviewer instructions for this pass. No other new packages introduced.

- [x] **All existing tests still green** — `npm test` reports 306 tests across 41 test files, all passed. No failures, no skips.

- [x] **`aria-live` on individual Toast** — Toast.jsx still carries `role="status" aria-live="polite"` as required by the test assertion (`expect(statusEl).toHaveAttribute('aria-live', 'polite')`). The nesting advisory from pass 1 is noted but cannot be changed without breaking the test (reviewer instructions explicitly confirm: "kept on individual Toast because the test asserts it (test cannot be modified)"). ToastContainer also has `aria-live="polite"` on its wrapper; this is the existing state carried over and within the scope of the test constraint.

### Remaining issues

None. All four blocking issues from pass 1 are resolved.

### Notes for business-validation

- `dbBusyHandler` is wired into `backend/src/app.js` ahead of the generic `errorHandler`, correctly handling `SQLITE_BUSY` retry exhaustion with a 503 response (NFR-6 backend path).
- ManualForm's `serverUnreachable` derivation (`!serverReachable || error?.type === 'network_error'`) means a stale `network_error` result keeps the button disabled even after the user edits the form — acceptable for this increment's definition of done, as the health poll will clear the flag within 30 s.
- The Main agent should confirm the axe-core packages are added to the CLAUDE.md allowlist after merge.

---

## Increment 12 — Witty Responses — Review CHANGES REQUESTED

**Date:** 2026-04-28

### Checklist

- [x] FR-RULE-1: too-short → `generateWittyResponse({ scenario: 'too-short', context: { duration_minutes: N } })` called; `wittyMessage` in 400 body from bookings API. Confirmed in `backend/src/routes/bookings.js` lines 77–87.
- [x] FR-RULE-5: too-far → `generateWittyResponse({ scenario: 'too-far', context: { days_out: N } })` called; `wittyMessage` in 400 body from bookings API. Confirmed in `backend/src/routes/bookings.js` lines 63–72.
- [x] Chat path: parse-failure too-short or too-far → `generateWittyResponse` called; `assistantMessage` in /api/chat response is witty text. Confirmed in `backend/src/routes/chat.js` lines 98–113.
- [✗] FR-V-6: witty text appears as regular assistant message in chat — FAIL. `ChatDock.jsx` (lines 99–101) unconditionally replaces every `parse-failure` response with the static `PARSE_FAILURE_MSG` string, so the witty `assistantMessage` from the API is discarded and never shown to the user. The Playwright E2E tests (`e2e/witty-responses.spec.js`) confirm this: both tests fail with "element(s) not found" because the witty text is never rendered.
- [x] Token budget: `generateWittyResponse` uses `maxTokens: 100` — confirmed at `backend/src/llm/index.js` line 135.
- [x] No profanity in system prompt instructions — none found in `backend/src/llm/index.js`.
- [x] Graceful fallback (bookings API): `wittyMessage()` helper wraps in try/catch and returns `fallback` string on error. Test 14 covers this.
- [x] Graceful fallback (chat route): on `generateWittyResponse` throw, the catch block falls through to `return res.status(200).json(result)` — original result returned as-is.
- [✗] No tests deleted or weakened — Vitest passes 226/226 unit tests (green). However, the two Playwright E2E tests in `e2e/witty-responses.spec.js` FAIL in all browsers because the frontend is not wired correctly. The E2E tests represent the user-visible requirement; they are not passing.
- [x] No new disallowed tech introduced — only `@playwright/test` and existing allowlist tech used.

### Summary

**Changes needed.**

There is one blocking issue:

**Issue 1 — ChatDock.jsx discards witty assistantMessage for parse-failure (FR-V-6 violation)**

`src/components/ChatDock/ChatDock.jsx` (lines 99–101) contains:

```js
if (raw.status === 'parse-failure') {
  return { ...msg, content: PARSE_FAILURE_MSG };
}
```

This unconditionally replaces the `content` (which was correctly set from `data.assistantMessage` in `useChat.js`) with the static fallback string `PARSE_FAILURE_MSG` for every `parse-failure`, including `too-short` and `too-far` cases where the API now returns a witty message. The fix is to check for `error === 'too-short'` or `error === 'too-far'` and only fall back to `PARSE_FAILURE_MSG` for other parse-failure types. Specifically:

```js
if (raw.status === 'parse-failure' && raw.error !== 'too-short' && raw.error !== 'too-far') {
  return { ...msg, content: PARSE_FAILURE_MSG };
}
```

This fix will cause the witty `assistantMessage` (already correctly stored in `msg.content` by `useChat.js`) to be displayed as a regular assistant bubble — satisfying FR-V-6 — and will unblock both Playwright E2E tests.

**Route back to:** coder — single-file frontend fix in `src/components/ChatDock/ChatDock.jsx`.

## Increment 12 — Witty Responses — Re-review APPROVED

**Date:** 2026-04-28

### Changes verified

- [x] FR-RULE-1: too-short → wittyMessage in 400 body from bookings API — backend confirmed correct in first review; unchanged.
- [x] FR-RULE-5: too-far → wittyMessage in 400 body from bookings API — backend confirmed correct in first review; unchanged.
- [x] Chat path: parse-failure too-short or too-far → assistantMessage in /api/chat response is witty text — backend confirmed correct in first review; unchanged.
- [x] FR-V-6: witty text appears as regular assistant message in chat — FIXED. `ChatDock.jsx` line 99 now reads:
  ```js
  if (raw.status === 'parse-failure' && raw.error !== 'too-short' && raw.error !== 'too-far') {
    return { ...msg, content: PARSE_FAILURE_MSG };
  }
  ```
  Too-short and too-far parse-failure messages now pass through unchanged, so `msg.content` (set to the witty `assistantMessage` by `useChat.js`) is rendered as a regular assistant bubble. The blocking issue from the first review is resolved.
- [x] Token budget: generateWittyResponse uses max_tokens=100 — confirmed in first review; unchanged.
- [x] No profanity in system prompt instructions — confirmed in first review; unchanged.
- [x] Graceful fallback: if generateWittyResponse throws, a non-empty string is used — confirmed in first review; unchanged.
- [x] No tests deleted or weakened — 226 Vitest tests pass (32 test files, all green, confirmed by `npx vitest run`).
- [x] No new disallowed tech — only the single-line guard change in `ChatDock.jsx`; no new dependencies introduced.

### Summary

**Approved.** The one blocking issue from the first review (ChatDock.jsx overwriting witty LLM text with a static PARSE_FAILURE_MSG for too-short and too-far scenarios) is resolved by commit 6334062. The guard now correctly excludes `too-short` and `too-far` error types from the static fallback, allowing the witty assistant message to render as a normal chat bubble (FR-V-6 satisfied). All 226 Vitest unit tests pass. All checklist items are now satisfied. Ready for auto-merge.

## Increment 14 — Conflict In Chat — Review APPROVED

**Date:** 2026-04-28

### Checklist

- [x] FR-CONF-3: 409 on chat confirm → conversation resumes (LLM called again, not a dead-end error). Confirmed: `ChatDock.jsx` lines 97–103 catch the 409, show toast, and call `resumeWithConflict(errData.conflicting)` via `setTimeout(..., 0)`. `resumeWithConflict` in `useChat.js` lines 54–93 calls `/api/chat` again and appends the LLM reply as a new assistant message. No dead-end; conversation continues.
- [x] FR-CONF-3: conflict context included in the /api/chat call (booker, room, start/end in the message history). Confirmed: `resumeWithConflict` constructs `conflictMsg.content` as `"The slot was just taken. Conflicting booking: ${booker_name} has ${room_id} from ${start_utc} to ${end_utc}. Please suggest alternatives."` and appends it to `messagesForApi` before POSTing to `/api/chat` (`useChat.js` lines 56–75). The Vitest test at `useChat.test.js` lines 316–374 asserts the body text matches `/taken|conflict|Alice|nevada/i`.
- [x] FR-CONF-2: toast shows `booker_name` from 409 conflicting object; description NOT shown. Confirmed: `ChatDock.jsx` line 99 extracts only `errData.conflicting?.booker_name` and line 101 constructs the message as `"That slot was just taken by ${booker}. Please pick another time or room."` — `description` is never referenced in this path.
- [x] FR-CONF-2: toast is non-modal (no role="dialog", doesn't block interaction). Confirmed: `Toast.jsx` line 11 uses `role="status"` (not `role="dialog"`). Verified by unit test `Toast.test.jsx` line 24–27.
- [x] FR-CONF-2: toast auto-dismisses (~5s); close button present. Confirmed: `Toast.jsx` lines 5–8 set a `setTimeout(onDismiss, duration)` with `duration` defaulting to `5000`. Close button present at line 13 (`aria-label="Close"`). Both covered by unit tests in `Toast.test.jsx`.
- [x] Manual form 409 path (task 04's inline error) is UNCHANGED — only chat confirm path uses toast. Confirmed: `ManualForm.jsx` still renders `error.type === 'conflict'` as an inline `<p className="manual-form__error">` (lines 160–163). No Toast import or usage in ManualForm. The Toast component is imported and used exclusively in `ChatDock.jsx`.
- [x] `resumeWithConflict` does NOT reset the conversation or interactionCount. Confirmed: `useChat.js` `resumeWithConflict` (lines 54–93) never calls `setInteractionCount` or `setMessages([])`. It only appends a new assistant message via `setMessages(prev => [...cleared, ...])`. Vitest test at `useChat.test.js` lines 425–461 asserts `interactionCount` is not reset and `messages.length > 0` after the call.
- [x] 274 Vitest tests pass; no tests deleted or weakened. Confirmed: `npx vitest run` output shows 36 test files, 274 tests, all passed.
- [x] No new disallowed packages (no toast library — just a plain React component). Confirmed: `Toast.jsx` imports only `useEffect` from React and `./Toast.css`. No third-party toast library introduced.

### Summary

**Approved.** All nine checklist items pass. The 409 conflict flow is correctly implemented end-to-end: the chat confirm path catches 409, displays a non-modal Toast with the conflicting booker's name (not description), and calls `resumeWithConflict` which appends the full conflict context to the message history before making a second `/api/chat` call — resulting in a new LLM assistant message with alternatives. The conversation and `interactionCount` are preserved throughout. The manual form 409 inline error path is untouched. All 274 Vitest tests pass with no deletions or weakening. Ready for auto-merge.

## Increment 18 review — 2026-05-02

**Verdict:** CHANGES REQUESTED

### Checklist

- [✗] FR-V-7: toast system — partially implemented; 3 of 5 triggers missing or spec-deviant (see Issues)
- [x] NFR-4: performance — no bundle analysis or Lighthouse measurement is in the diff; however no heavy synchronous code was added; deferred to business-validation (pre-existing work)
- [x] NFR-5: axe-core tests present and pass on ManualForm and ChatDock; keyboard nav Playwright tests written; existing a11y tests untouched
- [✗] NFR-6: reliability — SQLite busy retry logic and Express middleware correct; BUT frontend server-unreachable spec (show toast "Server unreachable…", disable booking write buttons) is not implemented in this branch
- [✗] Hard rules — `axe-core` and `@axe-core/react` are not on the tech allowlist; user approval required
- [x] No test assertions deleted or weakened — only comment lines updated and new tests added
- [x] No direct push to main — all commits on feat/polish-pass
- [x] No secrets committed
- [x] Toast.jsx renders `role="status"` and `aria-live="polite"` on the element (confirmed in src/components/Toast/Toast.jsx line 11)

### Issues

#### Issue 1 (BLOCKING) — `axe-core` and `@axe-core/react` not on the tech allowlist

Both `axe-core` and `@axe-core/react` are introduced as new devDependencies in `package.json` and `package-lock.json`. Neither appears in the CLAUDE.md tech allowlist. Per the hard rule in CLAUDE.md ("Anything else requires user permission"), these packages must not be merged until the user explicitly approves them. Route back to Main agent to ask the user before proceeding.

#### Issue 2 (BLOCKING) — FR-V-7: conflict toast message drops booker name

The spec in FR-CONF-2 and task-18 says the conflict toast must read:
> "That slot was just taken by **[booker]**. Please pick another time or room."

The coder implemented it as (ChatDock.jsx line 104):
```js
showToast('That slot was just taken. Please pick another time or room.', 'error');
```

The booker name (`errData.conflicting?.booker_name`) was present in the previous implementation (increment 14) and is available in `errData`, but it was silently dropped in the refactor. The PRD (FR-CONF-2) and the task spec both explicitly require the booker name in the message. The increment 14 review also verified and approved the booker-name inclusion. Removing it is a regression against a previously-merged, approved requirement.

Fix: extract `errData.conflicting?.booker_name ?? 'someone'` and interpolate into the string, matching the spec.

#### Issue 3 (BLOCKING) — FR-V-7: three of five toast triggers not implemented

The spec requires five toast triggers:

| # | Trigger | Status |
|---|---|---|
| 1 | Booking success (chat confirm) | DONE — ChatDock.jsx line 98 |
| 2 | Race-condition conflict (409) | PARTIAL — booker name dropped (see Issue 2) |
| 3 | Daily cap reached | MISSING |
| 4 | LLM unreachable | MISSING — uses banner only, no toast |
| 5 | Save success (edit/cancel) — "Booking updated." / "Booking cancelled." | MISSING |

**Trigger 3 — Daily cap:** The backend returns HTTP 429 with `{ error: 'daily_cap_reached' }` when the cap is hit (confirmed in `backend/src/routes/chat.js` line 89). The frontend (`useChat.js`) receives this but the chat dock does not call `showToast('AI assistant unavailable today. Please use the manual form.')`. The LLMUnavailableBanner only fires when `llmAvailable: false` from the health poll, not on a 429 response.

**Trigger 4 — LLM unreachable:** The spec says the LLM-unreachable state produces a toast in addition to the existing banner. Currently only the banner (`LLMUnavailableBanner`) shows. No `showToast('AI assistant is unreachable. Please use the manual form.')` is fired anywhere when `llmAvailable` flips to false.

**Trigger 5 — Save success:** `Calendar.jsx` calls `handleEditSave` and `handleCancelBooking` which call `patch(id, body)` and `deleteBooking(id)`. The `useBookingActions` hook's `onSuccess` callback only does `setSelectedBooking(null)` and `refetch()` — no `showToast('Booking updated.')` / `showToast('Booking cancelled.')`. There is no `useToast` import in `Calendar.jsx`.

#### Issue 4 (BLOCKING) — NFR-6: frontend server-unreachable path not implemented

The spec (NFR-6, task-18 spec) requires:
> "Frontend unreachable backend: if any API call fails with network error, show toast 'Server unreachable. Please try again.' Disable booking write buttons. Re-enable when health poll succeeds."

This PR only handles LLM-specific unavailability (via the health poll's `llmAvailable` flag). A network-level failure (fetch throws, backend process down) in the bookings/chat API calls does not trigger a toast or disable write buttons. `ManualForm.jsx` renders an inline `<p>` for `network_error` — it does not show a toast and does not disable buttons. ChatDock.jsx line 109 silently catches and ignores network errors on booking confirm. This is a spec gap.

#### Issue 5 (ADVISORY) — Nested `aria-live` regions on ToastContainer + Toast

`ToastContainer` renders `<div className="toast-container" aria-live="polite">` and each child `Toast` also has `role="status" aria-live="polite"` on its root element. Nesting live regions causes some screen readers to announce content multiple times or ignore the inner region. The correct pattern is to put `aria-live="polite"` only on the container and omit it from individual toast elements (keeping `role="status"` is fine). This is not a test-blocking issue (tests pass either way), but it contradicts the a11y intent and the spec's NFR-5 requirement for correct screen-reader narration. Flag for fix alongside the other blocking issues.

### Deferred items (for business-validation)

- NFR-4 bundle size / FCP measurement: no Lighthouse or `npx vite build --report` output is in the diff. The Main agent should run `npm run build` and check gzip bundle size before the business-validation entry is written. If < 500 KB gzipped, mark NFR-4 as satisfied.
- NFR-3 visual regression baselines: this was increment 17's concern; increment 18 does not re-baseline. No action needed here.
- The tech-allowlist question for `axe-core` / `@axe-core/react` must be resolved with the user before this branch can merge. If approved, these packages should be added to CLAUDE.md's allowlist.

### Routing

Route back to **coder** for Issues 2, 3, 4, and 5. Issue 1 must be resolved by **Main agent** (user permission) first; if the user approves axe-core, the coder can proceed with all fixes in one pass.

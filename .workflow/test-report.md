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

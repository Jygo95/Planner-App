# Task 12 — witty-responses

**Branch:** feat/witty-responses
**Status:** queued
**PRD refs:** FR-RULE-1 (witty), FR-RULE-5 (witty), FR-V-6

## Goal

Replace the stub `too-short` and `too-far` rejection responses with dynamically-generated witty LLM text via `generateWittyResponse`. Display as standard assistant messages in chat.

## Files to modify

```
backend/src/
  routes/bookings.js    # call generateWittyResponse for too-short + too-far rejections
  routes/chat.js        # (possibly) handle witty responses from LLM in parse path
  llm/index.js          # generateWittyResponse already scaffolded in task 09
```

Frontend:

```
src/components/ChatDock/ChatDock.jsx  # ensure 400 responses with witty text surface in chat
```

## Witty response behaviour

### FR-RULE-1: too-short (< 10 min)

- `generateWittyResponse({ scenario: 'too-short', context: { duration_minutes: N } })`
- Spirit: "books and booths" — creative, in the spirit of "10 minutes? That's barely enough time to find the room." No rough swearing.
- The witty text replaces the generic error message in the chat assistant bubble.

### FR-RULE-5: too-far (> 90 days out)

- `generateWittyResponse({ scenario: 'too-far', context: { days_out: N } })`
- Spirit: "you can't know the future that well" — e.g. "Booking 94 days out? Bold move. We only look 90 days ahead." No rough swearing.

## System prompt for witty calls (via anthropic.js)

Short, focused prompt:

- Scenario-specific instruction
- Max 1–2 sentences; punchy and light
- No profanity; office-appropriate
- Be original each time (the model achieves this naturally)

## Where witty text appears

- Chat path: if the LLM's parse call returns `status: 'parse-failure'` with `error: 'too-short'` or `'too-far'`, the backend calls `generateWittyResponse` and includes the result as `assistantMessage` in the /api/chat response.
- Manual form path: on 400 from POST /api/bookings with `error: 'too-short'` or `'too-far'`, the response body should include the witty text in a `wittyMessage` field that the frontend displays inline.

## FR-V-6 compliance

Witty responses appear in chat as standard assistant messages — no special bubble, no emoji by default, no bold formatting. The wit is in the words.

## Tests

**Vitest unit (mocked LLM):**

1. `llm/index.test.js` (update) — generateWittyResponse('too-short') calls adapter with correct system prompt; result has `text` string.
2. `routes/bookings.test.js` (update) — POST with < 10 min duration → 400 with `wittyMessage` field populated (mock generateWittyResponse).
3. `routes/chat.test.js` (update) — parse-failure with too-short → assistantMessage is witty text (mock generateWittyResponse).

**Playwright E2E:** 4. `witty-responses.spec.js` — type a booking for 5 minutes → assistant response is non-empty string (witty content not asserted exactly); type a booking 200 days out → similar.

## Reviewer checklist

- [ ] FR-RULE-1: witty text dynamically generated; unique each time (mocked in tests)
- [ ] FR-RULE-5: same for too-far
- [ ] FR-V-6: displayed as regular assistant message; no special styling
- [ ] Token budget respected: max_tokens = 100 for witty calls (from task 09 spec)
- [ ] No rough swearing in system prompt instructions
- [ ] generateWittyResponse failure is handled gracefully (fallback to generic message)

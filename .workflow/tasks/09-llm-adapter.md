# Task 09 — llm-adapter

**Branch:** feat/llm-adapter
**Status:** queued
**PRD refs:** C-2, FR-LLM-5, FR-LLM-6, FR-LLM-7, NFR-6

**⚠ API KEY REQUIRED:** Before this increment starts, create `backend/.env` with `ANTHROPIC_API_KEY=sk-ant-...`. Alert user.

## Goal

LLM abstraction layer, Anthropic adapter, POST /api/chat endpoint, system prompt, token budgets. Health endpoint updated with live llmAvailable.

## Files to create / modify

```
backend/src/
  llm/
    index.js          # public interface: parseBookingRequest, generateWittyResponse
    anthropic.js      # ONLY file that imports @anthropic-ai/sdk; dispatches to Claude API
  routes/
    chat.js           # POST /api/chat
    health.js         # (modify) add live llmAvailable check
  index.js            # (modify) mount chat router at /api/chat
```

## LLM abstraction interface

### `parseBookingRequest({ conversationHistory, contextSnapshot })`

Returns: `{ assistantMessage: string, parsedFields: object, status: 'needs-clarification'|'ready-to-confirm'|'parse-failure' }`

`parsedFields` shape: `{ room_id?, start_utc?, end_utc?, booker_name?, description?, timeAdjusted? }`

### `generateWittyResponse({ scenario, context })`

Returns: `{ text: string }`
`scenario`: `'too-short'` | `'too-far'`

## contextSnapshot (always provided to parseBookingRequest)

```js
{
  nowRiga: string,           // current Europe/Riga ISO datetime
  rooms: ROOMS,              // all 3 rooms with full metadata
  bookings_for_day: []       // populated by task 11; empty array here
}
```

## System prompt (FR-LLM-7)

Include in the parse call's `system` field:

1. Current Europe/Riga datetime (`contextSnapshot.nowRiga`)
2. All three rooms' metadata (id, name, capacity, equipment, notes)
3. Output format: JSON with `assistantMessage` (natural language) + `parsedFields` (structured)
4. Behavioural rules:
   - Reject < 10 min with status 'parse-failure', error 'too-short'
   - Reject > 4 hours with clear message
   - Reject start in past
   - Reject > 90 days out, error 'too-far'
   - Round times to 5-min boundary; note adjustment
   - Ask clarifying questions for missing fields
   - On complete parse failure: set status 'parse-failure'
5. Room recommendation rules (FR-LLM-2): only recommend room if user hasn't specified one; flag equipment mismatch; explicit room choice wins.

## Token budgets (FR-LLM-5)

- Parse call: max_tokens = 200; truncate input if > 500 tokens (count approximately: 1 token ≈ 4 chars)
- Witty response call: max_tokens = 100; input limit ≈ 200 tokens

## POST /api/chat

Request body: `{ messages: [{role, content},...] }` (full conversation history — FR-LLM-6)

1. Assemble contextSnapshot (nowRiga = current Riga time; rooms = ROOMS; bookings_for_day = [] for now)
2. Call parseBookingRequest
3. Return: `{ assistantMessage, parsedFields, status }`
4. On LLM error: return 503 `{ error: 'llm_unavailable' }`

## Health endpoint update

`GET /api/health` → `llmAvailable`: try a minimal probe (or just check if ANTHROPIC_API_KEY is set); return false if key absent or last call failed. Keep the dailyCapRemaining field (still 500 static — live cap tracking in task 13).

## Anthropic model

Use `claude-haiku-4-5` (as specified in PRD §2.1 and in the allowlist: `claude-haiku-4-5`).

## C-2 compliance

- `backend/src/llm/anthropic.js` is the ONLY file that imports `@anthropic-ai/sdk`
- API key read from `process.env.ANTHROPIC_API_KEY` in anthropic.js only
- Never logged, never returned to frontend

## Tests

**Vitest unit (with mocked Anthropic SDK):**

1. `llm/index.test.js` — parseBookingRequest calls anthropic adapter; generateWittyResponse calls adapter; system prompt contains rooms + datetime; token budget enforced.
2. `llm/anthropic.test.js` — API call constructed correctly; model is claude-haiku-4-5; max_tokens set per spec.
3. `routes/chat.test.js` — POST /api/chat with conversation history → returns assistantMessage + parsedFields; 503 on adapter error.
4. `routes/health.test.js` (update) — llmAvailable: true when key set; false when key absent.

**Playwright E2E:** 5. `chat-api.spec.js` — POST to /api/chat with a booking request; response has assistantMessage string.

## Reviewer checklist

- [ ] C-2: only `anthropic.js` imports SDK; API key never in response body or logs
- [ ] FR-LLM-5: max_tokens set on both call types; input truncation present
- [ ] FR-LLM-6: backend receives full history; stores nothing between requests
- [ ] FR-LLM-7: system prompt has nowRiga, rooms, output format, behavioural rules
- [ ] Model is `claude-haiku-4-5` (not haiku-3, not sonnet)
- [ ] 503 returned on LLM error (not 500 with stack trace)
- [ ] NFR-6: health returns llmAvailable:false gracefully when key absent

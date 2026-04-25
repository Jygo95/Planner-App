# Task 13 — caps-and-limits

**Branch:** feat/caps-and-limits
**Status:** queued
**PRD refs:** FR-CHAT-4, FR-CHAT-5

## Goal

Session interaction cap (10 per conversation, banner at 5). Daily system-wide LLM call cap (500 per UTC day), tracked in backend, reset at 00:00 UTC.

## Files to modify

### Frontend

```
src/
  hooks/useChat.js              # track interactionCount; enforce cap; trigger banner
  components/ChatDock/
    ChatDock.jsx                # render InteractionBanner; disable input at 10
    InteractionBanner.jsx       # "N interactions left, wrap it up, please." / disabled message
```

### Backend

```
backend/src/
  db/migrations.js              # add daily_cap table (or use single-row counter in SQLite)
  lib/dailyCap.js               # getRemainingCalls(), decrementCap(), resetIfNewDay()
  routes/chat.js                # call decrementCap() before LLM call; 429 if cap reached
  routes/health.js              # return live dailyCapRemaining
```

## Session cap (FR-CHAT-4)

Tracked in `useChat` React state (not persisted — resets on page reload per C-6):

| interactionCount | UI state                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| 0–4              | Normal, no banner                                                                                            |
| 5–9              | InteractionBanner: "N interactions left, wrap it up, please." (N = 10 - count)                               |
| 10               | Input disabled; message: "You've reached the session limit. Please refresh the page or use the manual form." |

- One interaction = one user message + one assistant response
- Banner text is static UI copy, not LLM-generated
- Banner updates each turn (count down)
- Banner disappears if conversation resets (successful booking)

## Daily cap (FR-CHAT-5)

### Backend storage: `daily_cap` table

```sql
CREATE TABLE IF NOT EXISTS daily_cap (
  id INTEGER PRIMARY KEY CHECK (id = 1),  -- single row
  date_utc TEXT NOT NULL,                 -- YYYY-MM-DD
  calls_made INTEGER NOT NULL DEFAULT 0
);
```

### `lib/dailyCap.js`

- `getRemainingCalls(db)` → returns `500 - calls_made` for today's date; if date_utc ≠ today, returns 500 (auto-reset)
- `decrementCap(db)` → upsert: if date_utc = today, increment calls_made; if date_utc ≠ today, reset to 1
- Thread-safe because SQLite is single-writer; use `db.transaction()`

### In POST /api/chat

Before calling LLM:

1. `decrementCap()` — if it would exceed 500, return 429 `{ error: 'daily_cap_reached' }`
2. On 429: frontend shows system-wide banner: "AI assistant unavailable today. Please use the manual form."

### GET /api/health

`dailyCapRemaining`: live value from `getRemainingCalls()`. Frontend polls this on load and input focus (already wired in task 10).

## Frontend daily cap (FR-CHAT-5)

- `useHealthPoll` already checks `dailyCapRemaining` (task 10)
- If `dailyCapRemaining === 0` (or health returns `llmAvailable: false`): show system-wide banner: **"AI assistant unavailable today. Please use the manual form."**
- Manual form remains accessible

## Tests

**Vitest unit:**

1. `lib/dailyCap.test.js` — getRemainingCalls returns 500 on new day; decrementCap reduces count; auto-resets on new date; returns 0 when exhausted.
2. `routes/chat.test.js` (update) — 429 returned when cap reached; cap decremented on successful LLM call.
3. `routes/health.test.js` (update) — dailyCapRemaining reflects current count.

**Vitest / RTL:** 4. `InteractionBanner.test.jsx` — renders "N interactions left" at count 5; renders disabled message at 10; hidden below 5. 5. `useChat.test.js` (update) — interactionCount increments on each exchange; input disabled at 10; banner props correct.

**Playwright E2E:** 6. `caps.spec.js` — simulate 5 interactions → banner appears; 10 interactions → input disabled. Mock daily cap reached → system banner shown.

## Reviewer checklist

- [ ] FR-CHAT-4: banner at interaction 5 (not 6, not 4); input disabled at 10; static UI copy
- [ ] FR-CHAT-4: banner resets when conversation resets (booking success)
- [ ] FR-CHAT-5: cap is 500 per UTC day (not per user, not per session)
- [ ] FR-CHAT-5: cap resets at 00:00 UTC (not Riga time)
- [ ] dailyCapRemaining in health endpoint is live (not hardcoded 500)
- [ ] 429 on chat when cap reached; frontend shows correct banner

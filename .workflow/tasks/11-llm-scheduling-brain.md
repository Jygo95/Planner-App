# Task 11 — llm-scheduling-brain

**Branch:** feat/llm-scheduling-brain
**Status:** queued
**PRD refs:** FR-LLM-1, FR-LLM-2, FR-LLM-3, FR-LLM-4

## Goal

Inject live calendar data into the LLM context once a target date is resolved. Room recommendation and equipment-mismatch logic. Conflict response shape. Booker name verbatim in confirmation.

## Files to modify

```
backend/src/
  routes/chat.js          # populate bookings_for_day in contextSnapshot
  llm/index.js            # update system prompt section with scheduling instructions
  llm/anthropic.js        # no change (adapter stays thin)
```

## bookings_for_day injection (FR-LLM-1)

In `POST /api/chat` handler:

1. Parse the conversation history client-side to detect if a target date has been resolved (i.e., parsedFields from previous turn contains a `start_utc`).
2. If target date known: query `GET /api/bookings?from=<start-of-day>&to=<end-of-day>` (internally via the db, not HTTP) for the relevant room(s) — or all 3 rooms if no room narrowed yet.
3. Populate `contextSnapshot.bookings_for_day` with that result (exclude `description` from each — privacy).
4. Include in system prompt: today's bookings for the relevant room(s), formatted clearly.

`bookings_for_day` entry shape (description OMITTED):

```js
{
  (id, room_id, start_utc, end_utc, booker_name);
}
```

## Room recommendation rules (FR-LLM-2) — add to system prompt

- Only recommend a room if user has not specified one
- If user names a room AND adds an equipment constraint that room doesn't satisfy: flag mismatch ("California doesn't have a TV — book it anyway, or want a different room?")
- Explicit room choice always wins; constraints are advisory after explicit choice

## Conflict response shape (FR-LLM-4) — add to system prompt

When a slot is taken (from bookings_for_day), the LLM must respond:

> "[Booker] has the room until [HH:MM]. Available nearby: [time], [time], [time]. Pick one or suggest a different time."

- Booker name: shown
- Duration-until-free: shown
- Description: NEVER shown (privacy)
- Three alternatives: next free 30-min slot in same room, then +30, then +60

The three alternatives are computed by the LLM heuristically based on bookings_for_day data. The LLM is advisory; C-4 deterministic check still runs on write.

## Booker name verbatim (FR-LLM-3)

System prompt must instruct: "Always repeat the booker name exactly as provided by the user in the confirmation card parsedFields.booker_name. Do not correct spelling or capitalisation."

## Tests

**Vitest unit:**

1. `routes/chat.test.js` (update) — when previous parsedFields has start_utc, bookings_for_day is populated in contextSnapshot; when no start_utc, bookings_for_day is [].
2. `llm/index.test.js` (update) — system prompt contains bookings_for_day entries (without description); contains room recommendation rules; contains conflict response format.

**Playwright E2E:** 3. `llm-scheduling.spec.js` — multi-turn conversation: first message establishes date; second message includes room context in response (verify assistant mentions available/unavailable slots).

## Reviewer checklist

- [ ] FR-LLM-1: bookings_for_day populated only after date resolved; scoped to relevant rooms
- [ ] FR-LLM-1: description field ABSENT from bookings_for_day (privacy)
- [ ] FR-LLM-2: system prompt has room recommendation rules; equipment mismatch instruction
- [ ] FR-LLM-3: system prompt instructs booker name verbatim
- [ ] FR-LLM-4: conflict response shape in system prompt (booker, time-until-free, 3 alternatives, no description)
- [ ] C-4: LLM advice is advisory only; deterministic conflict check unchanged

# Task 14 — conflict-in-chat

**Branch:** feat/conflict-in-chat
**Status:** queued
**PRD refs:** FR-CONF-2 (toast), FR-CONF-3

## Goal

When a chat-driven booking write returns 409, resume the conversation with an LLM-generated FR-LLM-4-shape response. Show a toast for race-condition conflicts.

## Files to modify

```
src/
  components/ChatDock/
    ChatDock.jsx              # handle 409 from confirm action → resume conversation
  components/Toast/
    Toast.jsx                 # (scaffold or use from task 18; minimal version here)
    Toast.css
  hooks/useChat.js            # add conflict-resume flow
backend/src/
  routes/chat.js              # (optional) add a conflict-resume endpoint or handle in /api/chat
```

## Conflict-in-chat flow (FR-CONF-3)

When user clicks "Confirm booking" in ChatConfirmCard (task 10) and POST /api/bookings returns 409:

1. Do NOT show a generic error. Instead:
2. Add the 409 conflict data to the conversation context.
3. Call `/api/chat` again with the extended history, appending a synthetic "system" note: "The slot was taken. Conflicting booking: [booker] has [room] from [start] to [end]. Suggest alternatives."
4. The LLM generates a response in FR-LLM-4 shape: "[Booker] has the room until [HH:MM]. Available nearby: [time], [time], [time]. Pick one or suggest a different time."
5. This response appears as an assistant message. Conversation continues; user can pick an alternative without retyping.

## Toast for race-condition conflict (FR-CONF-2)

Show a toast notification: **"That slot was just taken by [booker]. Please pick another time or room."**

The toast:

- Appears for ~5 seconds then auto-dismisses
- Also dismissible via close button
- `[booker]` is the `booker_name` from the 409 `conflicting` object
- Used ONLY when the conflict is detected during the chat-confirm write (not the manual form — task 04 shows inline error)

## Minimal Toast component

Since full toast system is task 18, implement a simple one here:

- Fixed position, bottom-right
- One toast at a time (replace previous if new one fires)
- Props: `message`, `onDismiss`, `duration=5000`

## Tests

**Vitest / RTL:**

1. `ChatDock.test.jsx` (update) — on confirm 409: new assistant message appears with conflict info; conversation continues (input re-enabled).
2. `Toast.test.jsx` — renders message; auto-dismisses after duration; close button calls onDismiss.
3. `useChat.test.js` (update) — conflict409 flow: calls /api/chat with conflict context appended; sets correct conversation state.

**Playwright E2E:** 4. `conflict-in-chat.spec.js` — simulate conflict (two Playwright tabs, both try same slot; second gets 409); verify toast appears and conversation resumes with alternative suggestions.

## Reviewer checklist

- [ ] FR-CONF-3: 409 on chat-confirm → conversation resumes (LLM called again); NOT a dead-end error
- [ ] FR-CONF-2: toast shows booker name from 409 response; description NOT shown
- [ ] Toast is non-modal (doesn't block interaction)
- [ ] Conversation history includes conflict context when LLM called for alternatives
- [ ] Manual form 409 (task 04) still shows inline error — not changed to toast

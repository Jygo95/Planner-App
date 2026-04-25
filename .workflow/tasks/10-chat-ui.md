# Task 10 — chat-ui

**Branch:** feat/chat-ui
**Status:** queued
**PRD refs:** FR-CHAT-1, FR-CHAT-2, FR-CHAT-3, FR-CHAT-6, FR-CHAT-7, FR-CHAT-8, FR-CHAT-9, C-6

## Goal

Chat input dock as the primary UI. 300-char limit. Multi-turn conversation display. Confirmation card in chat flow. LLM-unavailable and parse-failure states. Conversation reset on success.

## Files to create / modify

```
src/
  components/
    ChatDock/
      ChatDock.jsx            # outer container docked in layout
      ChatDock.css
      ChatInput.jsx           # textarea + send button + char counter
      ChatMessage.jsx         # single message bubble (user | assistant)
      ChatHistory.jsx         # scrollable list of ChatMessage
      ChatConfirmCard.jsx     # confirmation card inside chat (reuses ConfirmationCard from task 04)
      LLMUnavailableBanner.jsx # banner replacing input when LLM down
  hooks/
    useChat.js                # conversation state; POST /api/chat; session management
    useHealthPoll.js          # GET /api/health on load + on input focus
```

## ChatDock behaviour

### FR-CHAT-1: Position

- Docked; visible without scroll on all 6 viewports
- Mobile: bottom of screen
- Desktop/tablet: right panel or bottom of right column

### FR-CHAT-2: Character limit

- `<textarea>` maxes at 300 chars (enforce at field level — `maxLength={300}`)
- Live counter displayed: "247 / 300"
- Counter turns red at, say, ≥ 270 chars

### FR-CHAT-3: Multi-turn

- Each user message + assistant response added to ChatHistory
- History scrollable; new messages scroll into view
- Send button disabled while waiting for response

### FR-CHAT-6: Conversation reset

- On successful booking (POST /api/bookings returns 201): clear messages, clear input, return to empty state
- On page reload: conversation gone (lives only in React state — no localStorage)
- C-6 enforced: no persistence between sessions

### FR-CHAT-7: Confirmation card in chat

- When parsedFields are complete (status: 'ready-to-confirm'), assistant message includes ChatConfirmCard
- ChatConfirmCard shows: room, date, start, end, duration, booker name, description, time-adjusted note
- "Confirm booking" button → POST /api/bookings → on 201: reset conversation
- "Cancel" button → adds assistant message "Booking cancelled. What would you like to change?" and continues conversation

### FR-CHAT-8: Parse failure

- When status is 'parse-failure': assistant message "I couldn't find any booking details in that. Could you describe what you'd like to book? (e.g. 'Nevada room tomorrow 2–3pm for Alice')"

### FR-CHAT-9: LLM unavailable

- `useHealthPoll` checks /api/health on load and on textarea focus
- If `llmAvailable: false`: replace ChatInput with `<LLMUnavailableBanner>` → "AI assistant unavailable. Please use the manual form."
- If LLM becomes available again (next poll): banner removed, input restored

## Riga time display in confirmation card

All times shown in Europe/Riga. Use Intl.DateTimeFormat.

## Tests

**Vitest / RTL:**

1. `ChatInput.test.jsx` — renders textarea; maxLength=300; counter shows remaining chars; send disabled when empty; send disabled while loading.
2. `ChatHistory.test.jsx` — renders user + assistant messages in order; scrolls to latest.
3. `ChatConfirmCard.test.jsx` (or reuse task 04's ConfirmationCard tests) — shows all fields; confirm fires POST; cancel adds message.
4. `LLMUnavailableBanner.test.jsx` — renders when llmAvailable false; hidden when true.
5. `useChat.test.js` — sends full history on each message; adds response to history; resets on booking success.
6. `useHealthPoll.test.js` — calls health on mount; re-checks on focus event; returns llmAvailable.

**Playwright E2E:** 7. `chat-ui.spec.js` — type a message → see it in history → assistant responds; 300-char limit enforced; LLM-down banner shown when health returns false (mock API).

## Reviewer checklist

- [ ] FR-CHAT-1: chat dock visible without scroll on all viewports
- [ ] FR-CHAT-2: maxLength=300 on textarea; live counter visible
- [ ] FR-CHAT-3: full history sent on each POST /api/chat
- [ ] FR-CHAT-6: conversation NOT persisted in localStorage; reset on booking success
- [ ] C-6: no cross-session chat persistence
- [ ] FR-CHAT-7: confirmation card appears for ready-to-confirm; confirm writes booking; cancel continues conversation
- [ ] FR-CHAT-8: parse-failure message shown (not blank or error)
- [ ] FR-CHAT-9: LLM-down banner replaces input; "switch to manual" still accessible

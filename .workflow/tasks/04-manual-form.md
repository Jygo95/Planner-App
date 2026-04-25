# Task 04 — manual-form

**Branch:** feat/manual-form
**Status:** queued
**PRD refs:** FR-MAN-1–5, FR-CHAT-7

## Goal

Manual booking form UI (fallback path). "Switch to manual" affordance near chat dock. Confirmation card before write. Wires to the bookings API from task 03.

## Files to create / modify

```
src/
  components/
    ManualForm/
      ManualForm.jsx        # main form component
      ManualForm.css
      ConfirmationCard.jsx  # shared confirmation card (reused by chat in task 10)
      ConfirmationCard.css
  hooks/
    useBookingSubmit.js     # POST /api/bookings; handles response + errors
```

## ManualForm fields

| Field       | Input type            | Validation                              |
| ----------- | --------------------- | --------------------------------------- |
| Room        | `<select>` of 3 rooms | required                                |
| Date        | `<input type="date">` | required                                |
| Start time  | `<input type="time">` | required; step="300" (5-min increments) |
| End time    | `<input type="time">` | required; step="300"                    |
| Booker name | `<input type="text">` | required; trimmed; ≥ 1 char             |
| Description | `<textarea>`          | optional; max 500 chars                 |

All times are displayed and entered in Europe/Riga local time. Conversion to UTC happens before sending to API.

## "Switch to manual" affordance (FR-MAN-1)

- Small, unobtrusive link/button near chat dock (exact text: "Switch to manual" or "Use manual form")
- Present on every page load; not visually competing with chat
- Clicking shows ManualForm; ManualForm has a "Back to chat" button (FR-MAN-5)

## Confirmation card (FR-CHAT-7, FR-MAN-4)

Shown before any write. Fields displayed:

- Room name
- Date (Europe/Riga, formatted)
- Start time / End time (Europe/Riga HH:MM)
- Duration (e.g. "1 hour 30 min")
- Booker name (verbatim from input — FR-LLM-3 requirement shared)
- Description (if provided)
- Time-adjusted note if FR-RULE-4 rounding occurred (`timeAdjusted: true` from API)
- "Confirm booking" button → fires POST
- "Cancel" button → back to form without clearing

## Success/error feedback

- On 201: clear form, show toast "Booking confirmed" (toast component placeholder — full toast system is task 18)
- On 409: show inline message: "That slot was just taken by [booker]. Please pick another time or room."
- On 400 (rule violation): show inline error with server message
- On network error: show "Could not reach server. Please try again."

## Timezone handling

- All UI in Europe/Riga (`Europe/Riga` IANA zone, UTC+2/+3)
- Convert date+time inputs to UTC ISO before sending: use `Intl` API or manual offset (no external library)

## Tests

**Vitest / RTL:**

1. `ManualForm.test.jsx` — renders all fields; required validation prevents submit; submits correct payload; shows confirmation card; confirm fires POST; cancel returns to form.
2. `ConfirmationCard.test.jsx` — renders all fields; shows time-adjusted note when prop set; confirm + cancel callbacks fire.
3. `useBookingSubmit.test.js` — on 201 calls onSuccess; on 409 returns conflict error; on 400 returns rule error.

**Playwright E2E:** 4. `manual-form.spec.js` — fill form → see confirmation card → confirm → success (mock API or use real backend from task 03); 409 path shows conflict message.

## Reviewer checklist

- [ ] FR-MAN-1: affordance is unobtrusive (not competing with chat)
- [ ] FR-MAN-2: all 6 fields present, non-optional fields are required
- [ ] FR-MAN-3: client-side validation mirrors server rules (no < 10 min, no > 4 hrs, no past)
- [ ] FR-MAN-4: confirmation card shown before any write
- [ ] FR-MAN-5: "Back to chat" available; chat history unaffected by mode switch
- [ ] No API key exposed to frontend (all fetches to relative `/api/` paths)
- [ ] No external date/time library introduced (use Intl API)

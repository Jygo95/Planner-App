# Task 07 — booking-detail-panel

**Branch:** feat/booking-detail-panel
**Status:** queued
**PRD refs:** FR-CAL-5, FR-CAL-6, FR-LOG-1, FR-LOG-3

## Goal

Clicking a calendar booking opens a detail panel. Panel offers Edit and Cancel actions. Both write booking_log entries.

## Files to create / modify

```
src/
  components/
    BookingDetail/
      BookingDetailPanel.jsx    # slide-in panel or modal
      BookingDetailPanel.css
  hooks/
    useBookingActions.js        # PATCH + DELETE with optimistic state
```

`Calendar/BookingBlock.jsx` (from task 05) — add `onClick` that calls `onBookingSelect(booking)`.

## Detail panel content (FR-CAL-5)

- Room name
- Start / End time in Europe/Riga (HH:MM, date)
- Booker name
- Description (if present)
- Duration
- "Edit" button → opens ManualForm pre-filled (from task 04) with this booking's data; on save fires PATCH
- "Cancel booking" button → confirmation prompt → fires DELETE; closes panel

## Edit flow

- Open ManualForm in "edit mode" pre-filled with booking fields
- On confirm → PATCH /api/bookings/:id
- On success → panel closes, calendar refreshes

## Cancel flow

- Inline confirmation: "Cancel this booking?" [Yes, cancel it] [Keep it]
- On confirm → DELETE /api/bookings/:id
- Backend writes `cancel` log entry with snapshot BEFORE delete (verified by task 03)
- On 204 → panel closes, booking removed from calendar

## Tests

**Vitest / RTL:**

1. `BookingDetailPanel.test.jsx` — renders booking details; Edit button opens ManualForm pre-filled; Cancel button shows confirmation; confirming cancel calls DELETE.
2. `useBookingActions.test.js` — patch calls PATCH with correct body; delete calls DELETE; handles 409 on patch.

**Playwright E2E:** 3. `booking-detail.spec.js` — click booking in calendar → panel appears; verify fields; cancel booking → booking gone.

## Reviewer checklist

- [ ] FR-CAL-5: all required fields shown (room, start, end, booker, description)
- [ ] FR-CAL-6: Edit → booking_log `edit` entry; Cancel → booking_log `cancel` entry (verify via GET /api/bookings that booking is gone; log not exposed but trust task 03 tests)
- [ ] Description shown in detail panel (this is the owner's view, not a conflict message)
- [ ] No unauthenticated restriction: anyone can edit/cancel any booking (C-8 / FR-CAL-5)
- [ ] Panel accessible: keyboard-closeable (Escape), focus trapped while open

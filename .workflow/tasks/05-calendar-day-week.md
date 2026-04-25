# Task 05 — calendar-day-week

**Branch:** feat/calendar-day-week
**Status:** queued
**PRD refs:** FR-CAL-1 (day+week), FR-CAL-2, FR-CAL-3, FR-CAL-4

## Goal

Day view and Week view with multi-room columns, current-time indicator, room filter, navigation controls, and past/future bounds.

## Files to create

```
src/
  components/
    Calendar/
      Calendar.jsx          # view switcher + navigation container
      Calendar.css
      DayView.jsx           # single-day, 3-room columns
      WeekView.jsx          # 7-day, 3-room columns (or room rows)
      RoomFilter.jsx        # checkbox/pill filter; default all checked
      TimeIndicator.jsx     # horizontal line at current Riga time; updates ≥1/min
      BookingBlock.jsx      # renders one booking as a positioned block
  hooks/
    useBookings.js          # GET /api/bookings?from=ISO&to=ISO; re-fetches on date change
    useRigaTime.js          # returns current Europe/Riga time; updates every 30s
```

## Views

### Day view (FR-CAL-1)

- Columns: one per room (all 3 by default, filtered by RoomFilter)
- Rows: hours 00:00–23:59 (full 24h)
- BookingBlock positioned by start/end time (CSS top/height as % of day or px per hour)
- Each room column colour-coded (e.g. california=blue, nevada=green, oregon=amber) — consistent across views

### Week view (FR-CAL-1)

- 7 day columns, each subdivided by rooms
- Or: room rows with 7-day timeline — pick whichever is cleaner to implement; document choice

### Current-time indicator (FR-CAL-2)

- Horizontal red line across all room columns
- Position = (rigatime minutes since midnight) / 1440 \* containerHeight
- Updates every 30 seconds (≤ 1 min per spec)
- Only shown in Day and Week views, not Month

### Room filter (FR-CAL-4)

- Three toggles (california / nevada / oregon) — default all on
- Toggling hides that room's column; the remaining columns expand
- Persists only in React state (not localStorage)

### Navigation (FR-CAL-3)

- Day view: prev/next day buttons; "Today" button
- Week view: prev/next week; "This week"
- Bounds: cannot navigate before `today − 365 days` or after `today + 90 days`
- Past bookings still visible; UI just prevents navigating out of bounds

### View picker

- Buttons/tabs: "Day" | "Week" (Month added in task 06)
- Default: Day, today

## Data fetching

- `useBookings(from, to, roomIds)` calls `GET /api/bookings?from=ISO&to=ISO` (optionally `&room_id=X`)
- For Day view: from = start of day UTC, to = end of day UTC (Riga day boundaries converted to UTC)
- For Week view: full 7-day window

## Timezone rendering

All times displayed in Europe/Riga. Use `Intl.DateTimeFormat` with `timeZone: 'Europe/Riga'`.

## Tests

**Vitest / RTL:**

1. `DayView.test.jsx` — renders 3 room columns; booking block appears at correct position; filtered room hidden.
2. `WeekView.test.jsx` — renders 7 days; bookings appear on correct day.
3. `TimeIndicator.test.jsx` — renders at correct position given a mock time; updates on interval.
4. `RoomFilter.test.jsx` — toggling unchecks room; onFilterChange called with updated set.
5. `useBookings.test.js` — calls correct URL; returns parsed bookings; re-fetches on date change.

**Playwright E2E:** 6. `calendar.spec.js` — day view visible on load; navigate prev/next; room filter hides column; time indicator present.

## Reviewer checklist

- [ ] FR-CAL-2: time indicator updates ≤ 1 min interval
- [ ] FR-CAL-3: navigation bounds enforced (−365d / +90d)
- [ ] FR-CAL-4: all 3 rooms shown by default; filter works; rooms colour-coded
- [ ] Booking description NOT shown in calendar block (only room/time visible; detail panel is task 07)
- [ ] Riga timezone used for all display; UTC used for API calls
- [ ] No external calendar library (plain CSS + React)

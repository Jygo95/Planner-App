# Task 06 — calendar-month

**Branch:** feat/calendar-month
**Status:** queued
**PRD refs:** FR-CAL-1 (month)

## Goal

Month view showing aggregate booking density per day. Navigation. Update view picker to include Month.

## Files to create / modify

```
src/
  components/
    Calendar/
      MonthView.jsx       # 4–6 week grid; density per day cell
      MonthView.css
      Calendar.jsx        # add 'Month' to view picker
```

## Month view spec

- Grid: standard calendar month grid (weeks as rows, days as columns Mon–Sun or Sun–Sat)
- Each day cell shows: day number + booking density indicator
- Density indicator: count of bookings that day across all rooms (or a coloured dot / bar). Not individual booking titles.
- Room filter from task 05 still applies (density counts only unfiltered rooms)
- Clicking a day cell navigates to Day view for that day
- No current-time indicator in Month view

## Navigation

- Prev/next month buttons; "This month" button
- Bounds: same as task 05 (−365d / +90d) — grey out / disable out-of-bounds days

## Data fetching

- Query `GET /api/bookings?from=<month-start-UTC>&to=<month-end-UTC>` once per month view render
- Aggregate client-side by Riga date

## Tests

**Vitest / RTL:**

1. `MonthView.test.jsx` — renders correct number of day cells; density count shown for a day with mock bookings; clicking day navigates to Day view; out-of-bounds days visually disabled.

**Playwright E2E:** 2. `calendar-month.spec.js` — switch to Month view; correct month/year shown; prev/next navigation works.

## Reviewer checklist

- [ ] View picker now has Day | Week | Month
- [ ] Clicking day cell → Day view for that day
- [ ] Density counts respect room filter
- [ ] Out-of-bounds days greyed out, not interactive
- [ ] No external calendar library

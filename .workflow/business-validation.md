# Business Validation Log

---

## 01 — backend-skeleton — 2026-04-25

**Merge commit:** c8ef1cb
**PRD refs covered:** C-1, C-2, C-5, C-7, FR-CRON-2, NFR-6 (partial)

### Validation

- **C-1 (tech allowlist):** Express, better-sqlite3, dotenv, uuid, node-cron — all on allowlist. No unapproved packages.
- **C-2 (no data leaves backend except LLM call):** `backend/.env` gitignored; `.env.example` present with no key value. API key cannot be committed or returned to frontend.
- **C-5 (UTC storage):** bookings table stores `start_utc`, `end_utc`, `created_at_utc` as TEXT (ISO 8601). Correct foundation; time zone handling verified in future increments.
- **C-7 (booker_name as free-text):** Schema has `booker_name TEXT NOT NULL`. No auth lookup wired. Correct.
- **FR-CRON-2 (cron in same process):** Express server process established; cron job to be added in task 15 within this same process. Foundation correct.
- **NFR-6 (reliability — partial):** Health endpoint returns `ok: true`; error handler middleware present. Full reliability (SQLite retry, LLM unreachable) deferred to task 18 as specified.

### Constraints confirmed
- C-3 / FR-LOG-2: No route reads `booking_log`. No log endpoint exists. ✓
- `runMigrations` idempotent (IF NOT EXISTS). ✓
- `app` exported separately from `listen()`. ✓

### Deferrals
- NFR-6 full reliability (SQLite BUSY retry, LLM error path): task 18.
- `dailyCapRemaining` static 500: live tracking in task 13.
- `llmAvailable` static true: live check in task 09.

**Status: VALIDATED ✓**

---

## 02 — frontend-skeleton — 2026-04-25

**PRD refs covered:** FR-V-4, FR-V-5, NFR-1

### Validation

- **FR-V-4 (gear icon + settings sheet):** Gear icon present in header at all viewport widths. Settings sheet renders with three options (Auto / Force enable WebGL / Force CSS only). ✓
- **FR-V-5 (setting persistence):** `useWebGLSetting` reads and writes `localStorage` key `meeting-queuer.webgl-mode`. Default value `'auto'` when key absent. ✓
- **NFR-1 (responsive viewports):** Breakpoints tested at all 6 widths via Playwright: 430, 360, 1024, 1440, 3440, 1080. Single-column layout for < 1280px (covers mobile, tablet, and vertical monitor). Two-column at ≥ 1280px. ✓

### Constraints confirmed
- No Tailwind, no Redux, no CSS-in-JS — plain CSS throughout. ✓
- No TypeScript. ✓
- Gear icon not hidden at any breakpoint. ✓

### Deferrals
- Actual WebGL activation logic: task 16 (this task only persists the setting).
- Full visual styling (Liquid Glass): task 08.
- Chat dock and calendar area are placeholder divs only — content filled by tasks 05–10.

**Status: VALIDATED ✓**

---

## 03 — bookings-api — 2026-04-26

**Merge commit:** pending
**PRD refs covered:** C-4, C-7, FR-CAL-6, FR-CONF-1, FR-CONF-2, FR-LOG-1–3, FR-RULE-1–5

### Validation

- **C-4 (conflict check in transaction):** `checkConflict` SQL runs inside the same `db.transaction()` as INSERT/UPDATE — no TOCTOU window. Verified in `conflictCheck.js` and `bookings.js`. ✓
- **C-7 (booker_name free-text):** `booker_name` stored trimmed, no auth lookup, length ≥ 1 validated. ✓
- **FR-CONF-1 (409 shape):** Returns `{ error: 'conflict', conflicting: { id, room_id, start_utc, end_utc, booker_name } }`. No `description` field. ✓
- **FR-CONF-2 (privacy):** `checkConflict` SQL SELECT excludes `description`. Conflicting payload never exposes it. ✓
- **FR-LOG-1 (create log):** `appendLog(db, 'create', booking)` called after successful INSERT. ✓
- **FR-LOG-2 (no route reads booking_log):** No SELECT on `booking_log` anywhere in production routes. ✓
- **FR-LOG-3 (cancel snapshot before delete):** `existing` row fetched → `appendLog(db, 'cancel', existing)` → then DELETE. ✓
- **FR-RULE-1 (too-short < 10 min):** 400 `{ error: 'too-short' }`. ✓
- **FR-RULE-2 (too-long > 4 hr):** 400 `{ error: 'too-long', message: '...' }`. ✓
- **FR-RULE-3 (start in past):** 400 `{ error: 'start_in_past' }`. ✓
- **FR-RULE-4 (5-min rounding):** `roundToFiveMin` applied to start/end before persistence; `timeAdjusted: true` in response when rounding occurs. ✓
- **FR-RULE-5 (> 90 days):** 400 `{ error: 'too-far' }`. ✓

### Reviewer override rationale

Reviewer requested uppercase error codes (CONFLICT, TOO_SHORT, etc.) and 422 status for rule violations. Both contradict the task spec (`.workflow/tasks/03-bookings-api.md`) which explicitly specifies lowercase codes and 400. Tests written from spec confirm lowercase/400. Override applied per Main agent authority.

### Constraints confirmed
- No `booking_log` read endpoint. ✓
- PATCH self-exclusion uses `excludeId = id` in `checkConflict`. ✓
- All timestamps stored as ISO 8601 UTC via `.toISOString()`. ✓
- All IDs via `uuidv4()`. ✓

### Deferrals
- FR-RULE-1 witty text: task 12.
- FR-RULE-5 witty text: task 12.
- FR-CAL-6 (edit from calendar): task 07.

**Status: VALIDATED ✓**

---

## 04 — manual-form — 2026-04-26

**Merge commit:** pending
**PRD refs covered:** FR-MAN-1–5, FR-CHAT-7

### Validation

- **FR-MAN-1 (affordance unobtrusive):** "Switch to manual" button renders on initial load inside `.chat-dock` with low-prominence CSS class. Does not compete with chat visually. ✓
- **FR-MAN-2 (all 6 fields):** `room` select with 3 options, `date` date input, `startTime`/`endTime` time inputs (step=300), `bookerName` text input, `description` textarea. Non-optional fields carry `required` attribute. ✓
- **FR-MAN-3 (client-side validation):** `handleSubmit` enforces: duration ≥ 10 min, duration ≤ 4 hr, start not in past (Europe/Riga via Intl). Inline error shown; confirmation card not reached. ✓
- **FR-MAN-4 (confirmation card before write):** POST only fires from `handleConfirm` after user sees `ConfirmationCard`. `handleSubmit` sets `pendingBooking` and returns without POSTing. ✓
- **FR-MAN-5 ("Back to chat"):** Button present in form; `onClick` sets `showForm = false`. ✓
- **FR-CHAT-7 (confirmation card fields):** Room, date, start/end, duration, booker name, description (conditional), time-adjusted note (conditional). ✓
- **FR-RULE-4 client detection:** `timeAdjusted` computed by comparing raw vs rounded times client-side. Not hardcoded. ✓
- **409 inline message:** "That slot was just taken by [booker]." — `bookerName` from conflict response. ✓
- **No API key in frontend:** All fetches to relative `/api/bookings`. ✓
- **No external date library:** Intl API + native Date only. ✓

### Constraints confirmed
- No TypeScript, no Tailwind, no CSS-in-JS. ✓
- ManualForm wired in App.jsx inside `.chat-dock`. ✓

### Deferrals
- Full toast system for "Booking confirmed": task 18.
- FR-MAN-3 mirroring witty rejection text: tasks 12/14.
- Chat history continuity (mode switch): task 10 (chat UI).

**Status: VALIDATED ✓**

---

## 05 — calendar-day-week — 2026-04-26

**Merge commit:** pending
**PRD refs covered:** FR-CAL-1 (day+week), FR-CAL-2, FR-CAL-3, FR-CAL-4

### Validation

- **FR-CAL-1 (day+week views):** DayView renders 3 room columns; WeekView renders 7-day table. Both show BookingBlock per matching booking. ✓
- **FR-CAL-2 (time indicator ≤ 1 min):** `TimeIndicator` consumes `useRigaTime` (30s interval). Red horizontal line positioned at `(rigaMinutes/1440)*100%`. ✓
- **FR-CAL-3 (navigation bounds −365d/+90d):** `Calendar.jsx` clamps day and week navigation. Week nav additionally enforces `getWeekStart(next) >= minDate`. Bounds applied before state update. ✓
- **FR-CAL-4 (room filter):** `RoomFilter` renders 3 checkboxes, all checked by default. `filteredRooms` propagated to both `DayView` and `WeekView`. Column hides when unchecked (E2E verified). Colour-coding: california=blue, nevada=green, oregon=amber. ✓
- **Booking description not in BlockBlock:** `BookingBlock` renders booker name + time range only. Description excluded. ✓
- **Timezone correctness:** All display via `Intl.DateTimeFormat` with `timeZone: 'Europe/Riga'`. API calls use UTC ISO strings. ✓

### Constraints confirmed
- No external calendar library — plain CSS + React. ✓
- No TypeScript, no Tailwind, no CSS-in-JS. ✓
- `Calendar` wired into `App.jsx` `.calendar-area`. ✓
- `useRigaTime` consumed (not dead code). ✓

### Deferrals
- Month view: task 06.
- Booking detail panel (click → edit/cancel): task 07.
- FR-CAL-5 (click event to detail panel): task 07.
- FR-CAL-6 (edit/cancel from calendar): task 07.

**Status: VALIDATED ✓**

---

## 06 — calendar-month — 2026-04-26

**Merge commit:** pending
**PRD refs covered:** FR-CAL-1 (month)

### Validation

- **FR-CAL-1 month view:** Month grid renders 4–6 week rows × 7 columns. Each day cell shows day number + density count (only bookings for `filteredRooms`). ✓
- **Day click → Day view:** `handleMonthDayClick` sets `currentDate` and `view='day'`. ✓
- **Out-of-bounds days disabled:** `aria-disabled="true"` + CSS class; `handleCellClick` returns early. ✓
- **Navigation bounds:** `navigateMonth` clamps to `minMonthStr`/`maxMonthStr` (−365d / +90d). ✓
- **View picker:** Day | Week | Month tabs present in `Calendar.jsx`. ✓
- **Density respects filter:** Density map built by filtering `bookings` on `filteredRooms.has(room_id)`. ✓

### Constraints confirmed
- No external calendar library — plain JS Date + Intl. ✓
- No TypeScript, no Tailwind. ✓

### Deferrals
- Booking detail panel from month view (click booking): task 07.

**Status: VALIDATED ✓**

---

## 07 — booking-detail-panel — 2026-04-26

**Merge commit:** pending
**PRD refs covered:** FR-CAL-5, FR-CAL-6, FR-LOG-1, FR-LOG-3

### Validation

- **FR-CAL-5 (panel fields):** Room display name (California/Nevada/Oregon via lookup), start/end in Europe/Riga HH:MM, duration, booker name, description (conditionally). ✓
- **FR-CAL-5 (Edit action):** "Edit" button opens inline pre-filled form (UTC→Riga conversion on open); `onEditSave(payload)` fires PATCH with full body on confirm. ✓
- **FR-CAL-5 (Cancel action):** Inline confirmation "Cancel this booking?" shown before DELETE fires; "Yes, cancel it" calls `onCancelConfirm(id)`. ✓
- **FR-CAL-6 (log writes):** PATCH fires booking_log `edit` entry server-side (per task 03 tests). DELETE fires `cancel` entry with pre-delete snapshot (per task 03 tests). ✓
- **FR-LOG-1/FR-LOG-3:** Covered by task 03 backend; trust confirmed there. ✓
- **Accessibility:** Escape key calls `onClose` via keydown useEffect. `data-testid="booking-detail-panel"` present. ✓
- **No auth restriction:** No auth check in panel — anyone can edit/cancel. ✓

### Constraints confirmed
- Description IS shown (owner view, not conflict response). ✓
- `data-testid="booking-block-{id}"` matches E2E selector. ✓
- No new packages. ✓

### Deferrals
- Focus trap inside panel: task 18 (polish pass a11y).
- Full toast on edit/cancel success: task 18.

**Status: VALIDATED ✓**

---

## 08 — liquid-glass-css — 2026-04-26

**Merge commit:** pending
**PRD refs covered:** FR-V-1, FR-V-2, NFR-1, NFR-4, NFR-5

### Validation

- **FR-V-1 (glass design tokens):** All five tokens defined on `:root` — `--glass-bg`, `--glass-border`, `--glass-blur`, `--glass-shadow`, `--glass-specular`. SF font stack as `--font-stack`. Room color tokens. ✓
- **FR-V-1 (glass treatment):** `backdrop-filter` + `::before` specular highlight on all 5 main panels (App, Calendar, ManualForm, ConfirmationCard, BookingDetailPanel). ✓
- **FR-V-1 (buttons/inputs):** Glass tokens on all buttons and inputs; focus-visible rings (2px solid `#60a5fa`). Calendar toolbar buttons use `var(--glass-bg/border/radius-button)`. ✓
- **FR-V-2 (CSS-only baseline):** No WebGL dependency — pure CSS. ✓
- **NFR-5 (keyboard nav):** `button:focus-visible` and `input:focus` have visible outlines. `BookingBlock` has `role="button"`, `tabIndex={0}`, `aria-label` with booker + room + time. GearIcon has `aria-label="Settings"`. ✓
- **Dark theme:** Body dark gradient background; all components use glass tokens or dark-compatible `rgba(...)`. No light-mode hardcoded values remaining. ✓
- **MonthView cells:** Glass tokens throughout; dark-compatible hover/disabled states. ✓
- **SettingsSheet:** Glass hover/selected states. ✓

### Constraints confirmed
- No Tailwind, no CSS-in-JS, no new packages. ✓
- `--sans` leftover removed from `:root`. ✓
- `BookingDetailPanel` duplicate `overflow: hidden` removed; `overflow-y: auto` restored. ✓

### Deferrals
- Visual regression baseline comparison: task 17.
- Full a11y pass (focus trap, complete ARIA audit): task 18.
- WebGL refraction layer: task 16.

**Status: VALIDATED ✓**

---

## 10 — chat-ui — 2026-04-26

**Merge commit:** pending
**PRD refs covered:** FR-CHAT-1, FR-CHAT-2, FR-CHAT-3, FR-CHAT-6, FR-CHAT-7, FR-CHAT-8, FR-CHAT-9, C-6

### Validation

- **FR-CHAT-1 (dock visible without scroll):** Mobile: `position: fixed; bottom: 0` at 320px height — always visible. Desktop (≥1024px): fills its layout column. All 6 viewports covered. ✓
- **FR-CHAT-2 (300-char limit + counter):** `maxLength={300}` on textarea; live counter renders `{count} / 300`; counter style turns red at ≥270. ✓
- **FR-CHAT-3 (full history per request):** `useChat.sendMessage` builds `nextMessages = [...messages, userMessage]` and POSTs `{ messages: nextMessages }` — full accumulated history sent every call. ✓
- **FR-CHAT-6 (reset on success, no localStorage):** On POST `/api/bookings` 201: `resetConversation()` clears messages, `setInputValue('')` clears input. No `localStorage` writes anywhere in the chat stack. State lives in React state only. ✓
- **C-6 (no cross-session persistence):** Confirmed — `useChat` uses `useState` only; no `localStorage`/`sessionStorage`. Conversation gone on page reload. ✓
- **FR-CHAT-7 (confirmation card):** `ready-to-confirm` status injects `<ChatConfirmCard>` with all required fields; confirm POSTs to `/api/bookings`; cancel calls `sendMessage("Booking cancelled. What would you like to change?")` to continue. ✓
- **FR-CHAT-8 (parse-failure):** `parse-failure` status replaces message content with the specified guidance string. Not blank, not a raw error. ✓
- **FR-CHAT-9 (LLM-down banner):** `useHealthPoll` checks `/api/health` on mount and on `triggerPoll()`. When `llmAvailable: false`: `<LLMUnavailableBanner role="alert">` shown; `<ChatInput>` replaced by `<ManualForm>` (manual fallback accessible). When available again: input restored. `onFocus` on textarea wired to `triggerPoll()`. ✓

### Constraints confirmed
- No TypeScript, no Tailwind, no new npm packages. ✓
- No API key or sensitive data in any frontend file. ✓
- `ChatDock.css` uses glass tokens; no hardcoded light-mode values. ✓

### Deferrals
- Session cap (banner@5, disable@10): task 13.
- Daily cap enforcement: task 13.
- Conflict response in chat flow (409 → LLM message): task 14.
- Full toast on booking success: task 18.

**Status: VALIDATED ✓**

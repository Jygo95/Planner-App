# PRD — AI-Assisted Meeting Room Queuer

## 0. Summary

A web-based meeting room booking tool deployed on a closed-wifi network. Users describe their booking in natural language via a chat input (primary UI); an LLM extracts the fields, asks clarifying questions if data is missing, checks the calendar, presents a summary for confirmation, then writes the booking. A manual form is available as a tucked-away fallback.

Three rooms exist on day one (California, Nevada, Oregon). The frontend is responsive across mobile, tablet, desktop, widescreen, and vertical-monitor viewports. The visual style is an Apple Liquid Glass-faithful interpretation, CSS-only by default with an optional WebGL refraction layer on capable devices.

The LLM is Anthropic Claude Haiku via API in v1. The architecture is built so the LLM can be swapped to a local Ollama-hosted model later with zero changes outside one adapter file.

---

## 1. Constraints (apply everywhere)

These are non-negotiable. The Reviewer agent must verify each is honoured on every relevant PR.

- **C-1. Tech allowlist.** Frontend: HTML5, CSS3, JavaScript ES6+, React (Vite). Optional WebGL. Backend: Node.js + Express. Database: SQLite via `better-sqlite3`. Test stack: Vitest, React Testing Library, Playwright. Lint/format: ESLint, Prettier. Pre-commit: Husky, lint-staged. Anything else requires Main agent permission, which requires user permission.
- **C-2. No data leaves the backend except the LLM call.** Booking descriptions are confidential. The frontend never receives the API key. The LLM call is the only outbound network request from the backend.
- **C-3. The booking log is server-filesystem-only.** No HTTP route exposes log data. No UI surfaces it. The Reviewer agent must explicitly check this on any PR that touches logging or routing.
- **C-4. Deterministic conflict check is mandatory.** Even when the LLM has reasoned about availability, the booking write path must independently verify no overlap exists before inserting into the database. The LLM is advisory; the deterministic check is authoritative.
- **C-5. Timezone.** All times stored in UTC (ISO 8601). All natural-language times from users are interpreted as Europe/Riga. All UI rendering is Europe/Riga.
- **C-6. Conversation lifecycle.** Conversations exist only for the duration of one booking attempt. A successful booking, a manual page reload, or a navigation event resets the conversation. No chat history persists.
- **C-7. Booker identity is free-text "name" for v1.** LDAP integration is explicitly out of scope. The data model stores `booker_name` as a string.
- **C-8. No authentication.** The system trusts the closed wifi as its security perimeter.

---

## 2. Architecture

### 2.1 Stack

- **Frontend:** React + Vite, JavaScript only (no TypeScript). Tailwind, Redux, and CSS-in-JS libraries are not approved — use plain CSS modules or scoped CSS.
- **Backend:** Node.js + Express. Serves the built React app as static files and exposes the JSON API below. Single process.
- **Database:** SQLite file at `data/queuer.db`, accessed via `better-sqlite3`. Migrations run on server start.
- **LLM provider (v1):** Anthropic Claude API, model `claude-haiku-4-5`. API key in backend `.env`, gitignored.
- **Future LLM (out of scope but architecturally enabled):** Local Ollama-hosted Llama 3.1 8B or Qwen 2.5 7B.

### 2.2 LLM abstraction

All LLM access goes through `backend/src/llm/index.js`, which exposes:

- `parseBookingRequest({ conversationHistory, contextSnapshot }) → { assistantMessage, parsedFields, status, suggestedAlternatives? }`
- `generateWittyResponse({ scenario, context }) → { text }` — used for `< 10 min` and `> 3 months` rejections.

`contextSnapshot` always contains:
- Current Europe/Riga date+time.
- Full room metadata for all three rooms.
- A `bookings_for_day` array, populated only after the LLM has resolved a target date in conversation. Scope: that day, in the room(s) under discussion (or all three rooms if no room has been narrowed).

Only `backend/src/llm/anthropic.js` imports the Anthropic SDK. The abstraction file dispatches to it. Future Ollama swap touches only the adapter.

### 2.3 API contract

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/chat` | Send a user message + full conversation history. Returns assistant message and a `parsedFields` snapshot. |
| GET | `/api/bookings?from=ISO&to=ISO&room_id=string` | List bookings in a window, optionally filtered by room. |
| POST | `/api/bookings` | Create a booking. Performs deterministic conflict check before insert. |
| PATCH | `/api/bookings/:id` | Edit an existing booking. Same conflict check. |
| DELETE | `/api/bookings/:id` | Cancel a booking. |
| GET | `/api/rooms` | Return the hardcoded room metadata. |
| GET | `/api/health` | Returns `{ ok: true, llmAvailable: bool, dailyCapRemaining: int }`. Frontend polls on load and on chat-input focus. |

No log endpoint exists. No log endpoint will ever exist. The Reviewer agent must reject any PR that adds one.

---

## 3. Data model

### 3.1 Rooms (hardcoded, `src/config/rooms.js`)

```js
export const ROOMS = [
  {
    id: 'california',
    name: 'California',
    floor: 1,
    capacity: 5,
    equipment: ['camera', 'tv'],
    notes: 'First room',
  },
  {
    id: 'nevada',
    name: 'Nevada',
    floor: 2,
    capacity: 8,
    equipment: ['tv', 'whiteboard', 'conference-phone'],
    notes: 'Largest room, best for client calls',
  },
  {
    id: 'oregon',
    name: 'Oregon',
    floor: 1,
    capacity: 3,
    equipment: ['whiteboard'],
    notes: 'Quiet room, no AV',
  },
];
```

### 3.2 `bookings` table

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PRIMARY KEY | UUID v4 |
| `room_id` | TEXT NOT NULL | Must match a `ROOMS[].id` |
| `start_utc` | TEXT NOT NULL | ISO 8601 |
| `end_utc` | TEXT NOT NULL | ISO 8601 |
| `booker_name` | TEXT NOT NULL | Trimmed, length ≥ 1 |
| `description` | TEXT | Optional, max 500 chars |
| `created_at_utc` | TEXT NOT NULL | ISO 8601 |

Index on `(room_id, start_utc, end_utc)` for conflict-check performance.

### 3.3 `booking_log` table (append-only)

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PRIMARY KEY AUTOINCREMENT | |
| `at_utc` | TEXT NOT NULL | ISO 8601 |
| `action` | TEXT NOT NULL | `create` \| `edit` \| `cancel` \| `auto_purge` |
| `booking_id` | TEXT NOT NULL | |
| `snapshot_json` | TEXT NOT NULL | Full booking state at time of action |

Retention: indefinite. The 1-year auto-purge of `bookings` does **not** apply to `booking_log` — purge events themselves write a `auto_purge` log entry capturing the purged booking's snapshot.

---

## 4. Functional requirements — Calendar

### FR-CAL-1: Three views
The calendar must support Day, Week, and Month views, switchable via a control similar to Apple Calendar's view picker. Default view: Day, today.

### FR-CAL-2: Current time indicator
In Day and Week views, a horizontal line marks the current Europe/Riga time. It updates at least once per minute while the page is open.

### FR-CAL-3: Past and future visibility
Past bookings are visible until they exceed 1-year retention. Future bookings are visible up to the 3-month limit. Users can scroll/navigate freely within these bounds.

### FR-CAL-4: Multi-room rendering
Day and Week views must render all three rooms simultaneously, distinguishable by colour or column. Month view shows aggregate booking density per day. A room filter control is available; default is "all rooms shown".

### FR-CAL-5: Booking interaction
Tapping/clicking a booking on the calendar opens a detail panel showing: room, start/end (Europe/Riga), booker name, description. The detail panel offers Edit and Cancel actions. Anyone can edit or cancel any booking.

### FR-CAL-6: Edit and cancel are logged
Every edit and cancel writes a `booking_log` entry with the full snapshot at time of action. The `action` field distinguishes them.

---

## 5. Functional requirements — Chat input (primary UI)

### FR-CHAT-1: Position and prominence
The chat input is the primary UI element on every page load. It is docked prominently and visible without scrolling on every supported viewport.

### FR-CHAT-2: Character limit
User messages are limited to 300 characters. The input shows a live character count; over-limit input is prevented at the field level.

### FR-CHAT-3: Multi-turn conversation
Users may exchange multiple turns with the assistant. The assistant asks clarifying questions when fields are missing or ambiguous.

### FR-CHAT-4: Session interaction cap
A session is capped at 10 LLM interactions (one user message + one assistant response = one interaction). At interaction 5, a passive UI banner appears: **"5 interactions left, wrap it up, please."** The banner updates each turn (4 left, 3 left, …). At interaction 10, further input is disabled and the user is shown a message directing them to refresh or use the manual form. The banner text is static UI copy, not LLM-generated.

### FR-CHAT-5: Daily system-wide cap
The backend tracks total LLM calls per UTC day. At 500 calls, the chat is disabled system-wide and a banner appears: **"AI assistant unavailable today. Please use the manual form."** The cap resets at 00:00 UTC. The current count is exposed via `/api/health.dailyCapRemaining`.

### FR-CHAT-6: Conversation reset
On successful booking, the conversation clears immediately and the chat input returns to its empty state. On page reload or navigation, the conversation is gone (it lives only in client state).

### FR-CHAT-7: Confirmation card
Before any booking is written, the assistant presents a structured summary card showing every parsed field clearly: room, date, start time, end time, duration, booker name, description. The user must explicitly confirm via a "Confirm booking" button. A "Cancel" button discards and continues the conversation. Booking write happens only after confirmation.

### FR-CHAT-8: Complete parse failure
If the user's message contains no recognisable booking information (e.g., "hello", "what is this"), the assistant replies in chat that no relevant info was provided and prompts them to describe a booking.

### FR-CHAT-9: LLM unavailable
If `/api/health` returns `llmAvailable: false`, the chat input is replaced by a banner directing the user to the manual form. This is checked on page load and at the start of each user message.

---

## 6. Functional requirements — Manual form (fallback UI)

### FR-MAN-1: Discoverability
A small, unobtrusive affordance ("Switch to manual" or similar, with an icon) is present near the chat input. Obvious to a user looking for it; not visually competing with the chat.

### FR-MAN-2: Form fields
Opening the manual form presents: room (dropdown of three rooms), date picker, start time, end time, booker name (text), description (textarea, optional, max 500 chars). All non-optional fields are required.

### FR-MAN-3: Same validation
The manual form is subject to all the same booking rules as the chat path (FR-RULE section below). Server-side validation is identical regardless of source.

### FR-MAN-4: Confirmation
Submitting the form shows the same confirmation card as the chat path before writing.

### FR-MAN-5: Mode switch back
Once the manual form is open, the user can switch back to chat without losing context unnecessarily — but conversation does not bridge between modes (chat history is independent of manual form state).

---

## 7. Functional requirements — Booking rules

### FR-RULE-1: Minimum duration
Bookings less than 10 minutes (`end - start < 10 min`) are rejected. The rejection message is dynamically generated by the LLM via `generateWittyResponse({ scenario: 'too-short' })`, in the spirit of "books and booths" but unique each time. No rough swearing.

### FR-RULE-2: Maximum duration
Bookings longer than 4 hours are rejected with a clear, non-witty explanation: "Bookings over 4 hours are not allowed. Please shorten or split into multiple bookings." No auto-trim.

### FR-RULE-3: No past bookings
A booking whose `start` is in the past is rejected. "Right now" is permitted (see FR-RULE-4).

### FR-RULE-4: 5-minute rounding
- Specific times provided by the user (e.g., "14:00", "2:30 pm") are honoured exactly, but must align to a 5-minute increment. Non-aligned specific times (e.g., "14:03") are rounded to the nearest 5-minute mark, with a note in the confirmation card explaining the adjustment.
- Vague or relative times ("now", "in 5 minutes", "soon") round to the next 5-minute mark **once the current minute has elapsed**: at 15:30:00–15:30:59 → 15:30; at 15:31:00 → 15:35.
- All booking start and end times in the database are on 5-minute boundaries.

### FR-RULE-5: 3-month forward limit
Bookings whose start exceeds `now + 90 days` (Europe/Riga) are rejected with a dynamically-generated witty response via `generateWittyResponse({ scenario: 'too-far' })`. Spirit: "you can't know the future that well." No rough swearing.

### FR-RULE-6: 24/7 availability
There are no working-hour constraints. Any time of day or week is valid (subject to other rules).

---

## 8. Functional requirements — LLM behaviour

### FR-LLM-1: Scheduling brain
On every parse call where the user has named or implied a target date, the prompt includes that day's bookings for the relevant room(s). The LLM uses this to suggest alternatives, flag conflicts in conversation, and avoid proposing slots it can already see are taken. This is **advisory** — the deterministic conflict check (C-4) is the authority.

### FR-LLM-2: Room recommendation
The LLM only recommends a room when the user has not specified one. When the user names a room and adds an equipment constraint that the room does not satisfy, the LLM flags the mismatch and asks the user to choose ("California doesn't have a TV — book it anyway, or want a different room?"). Explicit room choice always wins; constraints become advisory.

### FR-LLM-3: Field confirmation
The booker name parsed by the LLM is repeated verbatim in the confirmation card so the user can catch typos before writing.

### FR-LLM-4: Conflict response shape
When the deterministic check (or the LLM's advisory check) finds a conflict, the chat responds in this shape:
> *"[Booker] has the room until [HH:MM]. Available nearby: [time], [time], [time]. Pick one or suggest a different time."*

Booker name shown. Duration-until-free shown. Description **never** shown (privacy). Three nearby alternatives offered (chosen by simple heuristic: next free 30-min slot in the same room, then +30, then +60; or per-room alternatives if no room was specified).

### FR-LLM-5: Token budgets
- Parse call: 500 input tokens, 200 output tokens (max).
- Witty response call: 200 input tokens, 100 output tokens (max).
- The Anthropic adapter sets these as `max_tokens` and the input is truncated server-side if it would exceed the input budget.

### FR-LLM-6: Stateless backend
The backend stores no conversation state between requests. The frontend sends the full conversation history on every `/api/chat` call. The backend is responsible only for assembling the context snapshot, calling the LLM, and returning the result.

### FR-LLM-7: System prompt
The system prompt for parse calls includes: current Europe/Riga datetime, all three rooms' metadata, format expectations (JSON-shaped output for structured fields plus a natural-language `assistantMessage`), behavioural rules covering FR-RULE-1 through FR-RULE-6, and FR-LLM-2 (room recommendation rules).

---

## 9. Functional requirements — Conflict and concurrency

### FR-CONF-1: Deterministic check on write
Every `POST /api/bookings` and `PATCH /api/bookings/:id` runs a synchronous SQL conflict check inside a transaction before insert/update: any existing row in the same `room_id` whose interval overlaps `[start_utc, end_utc)` causes rejection.

### FR-CONF-2: First write wins
On simultaneous attempts for the same slot, SQLite's transaction serialisation determines the winner. The loser receives an HTTP 409 with the conflicting booking's `room_id`, start, end, and booker name (description omitted). The frontend shows a toast: "That slot was just taken by [booker]. Please pick another time or room."

### FR-CONF-3: Conflict surfaces to chat
If the conflict happens on a chat-driven booking, the chat resumes with an LLM-generated response in the FR-LLM-4 shape, allowing the user to choose an alternative without re-typing context.

---

## 10. Functional requirements — Logging

### FR-LOG-1: Append-only
The `booking_log` table is written to on every successful create, edit, cancel, and auto-purge. The application never updates or deletes log rows.

### FR-LOG-2: No HTTP exposure
No route under `/api/` reads from `booking_log`. The Reviewer agent must explicitly check this.

### FR-LOG-3: Snapshot completeness
Each log row's `snapshot_json` contains the booking's full state at the moment of the action. For `cancel`, this is the state immediately before deletion. For `auto_purge`, this is the state at purge time.

---

## 11. Functional requirements — Cron / retention

### FR-CRON-1: Daily auto-purge
A scheduled job runs daily at 03:00 Europe/Riga time. It deletes all `bookings` rows whose `end_utc` is more than 365 days in the past. Each deletion writes an `auto_purge` entry to `booking_log` first.

### FR-CRON-2: Implementation
The cron job runs as part of the Express server process (e.g., via `node-cron` — added to allowlist). No separate worker process.

### FR-CRON-3: Idempotency
The job is safe to run multiple times in a day; it operates on the criterion `end_utc < now - 365d` and is naturally idempotent.

---

## 12. Functional requirements — Visual / UX

### FR-V-1: Liquid Glass faithful
The visual language follows Apple Liquid Glass: translucent layered surfaces, generous backdrop blur, subtle specular highlights via gradients, soft shadows, large rounded corners (16–24px on cards, 12px on inputs), San Francisco-style system font stack (`-apple-system, BlinkMacSystemFont, 'SF Pro', ...`).

### FR-V-2: CSS baseline
The core implementation uses CSS only: `backdrop-filter: blur()`, layered gradients, soft shadows. No WebGL is required for the design to look correct.

### FR-V-3: Optional WebGL refraction layer
A WebGL shader-based refraction effect is implemented for the chat input panel only. It activates only when:
- WebGL2 is supported AND
- A simple capability heuristic passes (e.g., `navigator.deviceMemory >= 4` if available, or a successful trial render under 50ms), AND
- The user setting permits it (see FR-V-5).

If any check fails, the CSS layer is used.

### FR-V-4: Gear icon and settings sheet
A small gear icon (⚙) is present in the calendar header on every viewport, including mobile. Tapping it opens a settings sheet with the WebGL toggle: **Auto** (default), **Force enable WebGL**, **Force CSS only**.

### FR-V-5: Setting persistence
The WebGL toggle setting persists in `localStorage` under key `meeting-queuer.webgl-mode`. Default value: `auto`.

### FR-V-6: Witty response display
Witty responses appear in the chat as assistant messages styled identically to other assistant messages — no special formatting. The wit is in the words, not the typography.

### FR-V-7: Toasts
All non-modal notifications (conflict notices, daily-cap notices, LLM-down notices, save success) are in-app browser toasts. No browser push notifications.

---

## 13. Non-functional requirements

### NFR-1: Responsive viewports
The application must render correctly on:
- iPhone 14 Pro Max (430×932)
- Small Android (360×800)
- iPad portrait (1024×1366)
- Desktop (1440×900)
- Widescreen (3440×1440)
- Vertical monitor (1080×1920) — uses the mobile layout

Width-based breakpoints. Vertical-monitor detection uses width threshold (`< 900px width → mobile layout regardless of height`).

### NFR-2: Test viewports
All Playwright E2E tests run on every viewport listed in NFR-1, on every PR. CI duration is monitored; the Reviewer agent flags any PR whose CI run exceeds 20 minutes.

### NFR-3: Visual regression
Playwright captures reference screenshots per viewport on first PR; subsequent PRs flag pixel diffs above a small threshold for human-style review (or, in this workflow, agent review).

### NFR-4: Performance
- First contentful paint under 2 seconds on iPhone 14 Pro Max over local wifi.
- Calendar view switching under 200ms.
- WebGL layer (if active) maintains 60fps on the same device for typical interactions.

### NFR-5: Accessibility
Standard a11y baseline: semantic HTML, all interactive elements keyboard-reachable, visible focus states, labels on form inputs, sufficient colour contrast against the translucent surfaces. Screen-reader narration of calendar bookings.

### NFR-6: Reliability
- Frontend handles backend unreachable: shows a banner, disables write actions.
- Backend handles SQLite locked: retries with short backoff, returns 503 if persistent.
- Backend handles LLM unreachable: returns `llmAvailable: false` from health, returns appropriate error from `/api/chat`.

---

## 14. Out of scope

Explicitly **not** in v1:
- Authentication / login.
- LDAP integration for booker identity.
- Mobile app (the responsive web is the only client).
- Multi-room scheduling beyond the three hardcoded rooms.
- An admin / analytics UI for the booking log.
- Push notifications or email confirmations.
- Recurring bookings.
- Booking attendees beyond the booker.
- CSV/iCal export.
- Internationalisation (English UI only; Latvian/Russian wait for later).

Items potentially picked up in the iteration phase: CSV export, recurring bookings, dark/light theme variant of Liquid Glass, optimistic UI for bookings, more sophisticated conflict-resolution UX.

---

## 15. Acceptance approach

The Definition of Done for each increment is **minimum adherence to the requirements numbered in this PRD that fall within the increment's scope**. Extended functionality, polish, and nice-to-haves move to the iteration phase.

For each merged increment, the Main agent appends to `.workflow/business-validation.md`:
- Increment ID and short name.
- The FR / NFR / V / C numbers covered.
- Confirmation that each is satisfied.
- Any deferrals to the iteration phase, with reason.

The Reviewer agent's review log entries reference FR / NFR / V / C numbers explicitly when raising concerns.

---

## 16. Open notes for Main agent

The following are recommendations for decomposition, not hard ordering. Main agent may reorder if there's a valid reason.

A reasonable increment ordering:

1. Backend skeleton: Express, SQLite, migrations, rooms config, health endpoint.
2. Frontend skeleton: Vite + React, page shell, gear-icon-and-settings-sheet plumbing.
3. Manual form path end-to-end: form → POST /api/bookings → calendar shows it. Conflict check (C-4) lands here.
4. Calendar views: Day, then Week, then Month.
5. Booking detail panel: edit and cancel actions, log entries on every action.
6. Liquid Glass CSS layer.
7. LLM adapter + `/api/chat` + chat input UI + multi-turn flow + confirmation card.
8. LLM scheduling-brain context injection (calendar data into prompt).
9. Witty-response paths (FR-RULE-1 too-short, FR-RULE-5 too-far).
10. Token budgets, session cap (FR-CHAT-4), daily cap (FR-CHAT-5).
11. Conflict-in-chat surfacing (FR-CONF-3).
12. Cron-driven 1-year retention (FR-CRON-*).
13. WebGL refraction layer + capability detection.
14. Visual regression baselines across all viewports (NFR-3).
15. End-to-end polish pass before transition to iteration phase.

Each of these is a candidate feature branch. Some may need to split further at decomposition time.

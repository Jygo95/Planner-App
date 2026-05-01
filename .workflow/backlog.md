# Backlog — AI-Assisted Meeting Room Queuer

Each row is one feature branch. Status: `queued` unless noted otherwise.

| # | Branch | Scope summary | Key PRD refs | Status |
|---|--------|---------------|-------------|--------|
| 01 | `feat/backend-skeleton` | Express server, SQLite init + migrations, rooms config, `GET /api/rooms`, `GET /api/health` | C-1,C-2,C-5,C-7,FR-CRON-2,NFR-6 | merged ✓ |
| 02 | `feat/frontend-skeleton` | Page shell, responsive breakpoints (6 viewports), gear icon + settings sheet, WebGL toggle in localStorage | FR-V-4,FR-V-5,NFR-1 | merged ✓ |
| 03 | `feat/bookings-api` | Full CRUD, deterministic conflict check in transaction, all server-side booking rules, booking_log writes, 409 shape | C-4,C-7,FR-CAL-6,FR-CONF-1,FR-CONF-2,FR-LOG-1–3,FR-RULE-1–5 | **active** |
| 04 | `feat/manual-form` | Manual form UI, confirmation card, "Switch to manual" affordance, wires to bookings API | FR-MAN-1–5,FR-CHAT-7 | queued |
| 05 | `feat/calendar-day-week` | Day + Week views, multi-room columns, current-time indicator, room filter, navigation, bounds | FR-CAL-1(day+wk),FR-CAL-2–4 | queued |
| 06 | `feat/calendar-month` | Month view with density, navigation, view picker updated | FR-CAL-1(month) | queued |
| 07 | `feat/booking-detail-panel` | Click event → detail panel, Edit + Cancel actions, booking_log writes | FR-CAL-5,FR-CAL-6,FR-LOG-1,3 | queued |
| 08 | `feat/liquid-glass-css` | Full Liquid Glass CSS layer all components + viewports, a11y pass | FR-V-1,FR-V-2,NFR-1,NFR-4,NFR-5 | queued |
| 09 | `feat/llm-adapter` | `backend/src/llm/index.js` + `anthropic.js`, `parseBookingRequest`, `generateWittyResponse`, `POST /api/chat`, system prompt, token budgets, health updated | C-2,FR-LLM-5–7,NFR-6 | queued |
| 10 | `feat/chat-ui` | Chat input dock (primary UI), 300-char limit, multi-turn display, confirmation card, LLM-unavailable + parse-failure + reset | FR-CHAT-1–3,6–9,C-6 | queued |
| 11 | `feat/llm-scheduling-brain` | `bookings_for_day` into context, room recommendation, conflict response shape, booker verbatim | FR-LLM-1–4 | queued |
| 12 | `feat/witty-responses` | Wire `generateWittyResponse` for too-short + too-far, replace stub rejections | FR-RULE-1(witty),FR-RULE-5(witty),FR-V-6 | queued |
| 13 | `feat/caps-and-limits` | Session cap (counter, banner@5, disable@10), daily cap (SQLite counter, reset midnight UTC, health live) | FR-CHAT-4,FR-CHAT-5 | queued |
| 14 | `feat/conflict-in-chat` | 409 in chat flow → LLM FR-LLM-4 shape response, slot-taken toast | FR-CONF-2(toast),FR-CONF-3 | merged ✓ |
| 15 | `feat/cron-retention` | node-cron daily at 03:00 Riga, delete bookings >365d, auto_purge log entry per row | FR-CRON-1–3 | merged ✓ |
| 16 | `feat/webgl-refraction` | WebGL2 shader refraction on chat panel, capability detection, CSS fallback, toggle wired | FR-V-3,FR-V-4 | **active** |
| 17 | `feat/visual-regression` | Playwright visual regression, reference screenshots per viewport, CI diff step | NFR-2,NFR-3 | queued |
| 18 | `feat/polish-pass` | Perf audit, reliability completion, full toast system, final a11y pass | NFR-4–6,FR-V-7 | queued |

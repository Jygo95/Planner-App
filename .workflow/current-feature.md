# Current Feature

**Status:** tests-pending
**Branch:** feat/caps-and-limits
**Phase:** increment

## Spec

### Increment 13 — Caps and Limits

Session interaction cap (10 per conversation, banner at 5). Daily system-wide LLM call cap (500 per UTC day), tracked in SQLite, reset at 00:00 UTC, live in /api/health.

**Full spec:** `.workflow/tasks/13-caps-and-limits.md`

## State machine

- queued
- tests-pending
- red
- green  ← **current**
- green
- review
- main-validation
- merged

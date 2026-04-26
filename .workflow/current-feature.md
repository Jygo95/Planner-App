# Current Feature

**Status:** tests-pending
**Branch:** feat/bookings-api
**Phase:** increment

## Spec

### Increment 03 — Bookings API

Full booking CRUD with deterministic conflict check in a SQLite transaction, all server-side booking rules, append-only booking_log writes, and correct 409 shape. No witty LLM text yet.

**Full spec:** `.workflow/tasks/03-bookings-api.md`

## State machine

- queued
- tests-pending  ← **current**
- red
- green
- review
- main-validation
- merged

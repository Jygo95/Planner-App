# Current Feature

**Status:** green
**Branch:** feat/cron-retention
**Phase:** increment

## Spec

### Increment 15 — Cron Retention

node-cron job runs daily at 03:00 Europe/Riga time. Deletes bookings older than 365 days. Writes auto_purge log entry per deleted row BEFORE deleting.

**Full spec:** `.workflow/tasks/15-cron-retention.md`

## State machine

- queued
- tests-pending
- red
- green  ← **current**
- review
- main-validation
- merged

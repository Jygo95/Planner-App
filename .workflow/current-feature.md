# Current Feature

**Status:** tests-pending
**Branch:** feat/conflict-in-chat
**Phase:** increment

## Spec

### Increment 14 — Conflict In Chat

When a chat-driven booking write (POST /api/bookings) returns 409, resume the conversation with an LLM-generated response suggesting alternatives. Show a toast notification with the conflicting booker's name.

**Full spec:** `.workflow/tasks/14-conflict-in-chat.md`

## State machine

- queued
- tests-pending
- red
- green  ← **current**
- review
- main-validation
- merged

# Current Feature

**Status:** main-validation
**Branch:** feat/chat-ui
**Phase:** increment

## Spec

### Increment 10 — Chat UI

Chat input dock (primary UI), 300-char limit, multi-turn display, confirmation card in chat flow, LLM-unavailable and parse-failure states, conversation reset on success.

**Full spec:** `.workflow/tasks/10-chat-ui.md`

## State machine

- queued
- tests-pending
- red
- green
- review
- main-validation  ← **current**
- merged

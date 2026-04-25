# Current Feature

**Status:** idle
**Branch:** —
**Phase:** increment

## Spec

(populated by Main agent from PRD)

## State machine

- queued
- tests-pending ← Tester writes failing tests
- red ← tests committed, expected to fail
- green ← Coder makes tests pass
- review ← Reviewer iterates with Coder/Tester
- main-validation ← Main checks business rules
- merged

# Current Feature

**Status:** red
**Branch:** feat/visual-regression
**Phase:** increment

## Spec

### Increment 17 — Visual Regression

Playwright visual regression: reference screenshots per viewport on first run; subsequent PRs diff against baseline and flag pixel diffs above threshold. 6 viewports × 5 views = 30 reference images.

**Full spec:** `.workflow/tasks/17-visual-regression.md`

## State machine

- queued
- tests-pending
- red  ← **current**
- green
- review
- main-validation
- merged

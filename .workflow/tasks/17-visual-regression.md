# Task 17 — visual-regression

**Branch:** feat/visual-regression
**Status:** queued
**PRD refs:** NFR-2, NFR-3

## Goal

Playwright visual regression: reference screenshots per viewport on first run; subsequent PRs diff against baseline and flag pixel diffs above threshold.

## Files to create / modify

```
e2e/
  visual-regression.spec.js     # screenshot test for all 6 viewports × key views
playwright.config.js            # add snapshotDir; configure threshold
.github/workflows/ci.yml        # add snapshot update step (manual) or diff-report step
```

## Viewports to cover (NFR-1)

| Name             | Width | Height |
| ---------------- | ----- | ------ |
| mobile-iphone    | 430   | 932    |
| mobile-android   | 360   | 800    |
| tablet           | 1024  | 1366   |
| desktop          | 1440  | 900    |
| widescreen       | 3440  | 1440   |
| vertical-monitor | 1080  | 1920   |

## Views to screenshot

For each viewport:

1. Landing page (Day view, chat dock visible)
2. Manual form open
3. Settings sheet open (gear icon clicked)
4. Week view
5. Month view

= 5 screenshots × 6 viewports = 30 reference images.

## Playwright snapshot config

In `playwright.config.js`:

```js
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 100,        // flag if > 100 pixels differ
    threshold: 0.2,            // per-pixel colour tolerance
    animations: 'disabled',    // freeze animations for stable screenshots
  },
},
snapshotDir: 'e2e/__snapshots__',
```

## Visual regression test structure

```js
import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile-iphone', width: 430, height: 932 },
  { name: 'mobile-android', width: 360, height: 800 },
  { name: 'tablet', width: 1024, height: 1366 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'widescreen', width: 3440, height: 1440 },
  { name: 'vertical-monitor', width: 1080, height: 1920 },
];

for (const vp of VIEWPORTS) {
  test(`landing page — ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    await expect(page).toHaveScreenshot(`landing-${vp.name}.png`);
  });
  // ... repeat for other views
}
```

## Baseline update workflow

- First run (no snapshots yet): `npx playwright test --update-snapshots` — generates reference PNGs
- Subsequent PRs: CI runs `npm run test:e2e` which diffs against committed PNGs
- If diff fails: CI uploads diff report as artifact; human (or Reviewer agent) inspects
- To accept changes: re-run `--update-snapshots` locally, commit new PNGs

## CI step (add to `.github/workflows/ci.yml`)

```yaml
- name: Upload visual diff report
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: visual-diff-report
    path: playwright-report/
    retention-days: 7
```

(This already exists for the general Playwright report; ensure it captures visual diff output.)

## Tests

The test file IS the tests. No additional unit tests needed.

**NFR-2:** Reviewer agent checks CI duration doesn't exceed 20 min. If 30 screenshots slow CI down, consider running only desktop viewport in blocking CI and others as non-blocking.

## Reviewer checklist

- [ ] NFR-2: all 6 viewports covered in spec
- [ ] NFR-3: snapshots committed to repo; diff fails CI on visual change
- [ ] `animations: 'disabled'` in config (prevents flaky snapshots)
- [ ] `maxDiffPixels` and `threshold` set (not zero — allows minor antialiasing diffs)
- [ ] CI duration after adding visual tests flagged if > 20 min total (NFR-2)
- [ ] Snapshot PNGs committed in `e2e/__snapshots__/` (not gitignored)

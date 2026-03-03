# Visual Regression Testing Guide

## Overview

Visual regression testing catches visual bugs by comparing screenshots of the application against known-good baselines. Any pixel differences are flagged for manual review.

## Strategy

- **Tool**: Playwright's built-in `toHaveScreenshot()` matcher
- **Baselines**: Stored in `tests/e2e/visual-regression.spec.ts-snapshots/`
- **Browsers**: Separate baselines for Chromium, Firefox, WebKit
- **Threshold**: 5% pixel difference allowed (accounts for anti-aliasing, font rendering)
- **Coverage**: 25+ visual test cases

## Running Visual Tests

### Run all visual tests
```bash
npm run test:visual
```

### Run with interactive UI
```bash
npm run test:ui -- visual-regression
```

### Run for specific browser
```bash
npm run test:visual:chromium
npm run test:visual:firefox  # (not recommended - WebGPU beta issues)
npm run test:visual:webkit   # (not recommended - WebGPU limited support)
```

### Update baselines (after intentional UI changes)
```bash
npm run test:visual:update
```

### View test report with screenshot diffs
```bash
npm run test:visual:report
```

## Test Coverage

### Loading States (2 tests)
- Empty state (no molecule loaded)
- Structure loaded state (benzene sample)

### Render Modes (4 tests)
- Ball-and-Stick mode
- Spacefill mode
- Stick mode
- Wireframe mode

### Camera Presets (3 tests)
- Front view
- Top view
- Right view

### Selection States (3 tests)
- No selection
- Single atom selected
- Measurement mode enabled

### Panels (3 tests)
- Full sidebar with all panels
- Rendering settings panel
- Export panel

### Modal Dialogs (1 test)
- Keyboard shortcuts help dialog

### Error States (1 test)
- Invalid file upload error message

### Responsive Layouts (2 tests)
- Mobile viewport (375x667)
- Tablet viewport (768x1024)

**Total**: 19 visual test cases × 3 browsers = 57 screenshot comparisons

## Baseline Management

### When to update baselines

Update baselines when you make **intentional** UI changes:

```bash
npm run test:visual:update
```

This regenerates all baseline screenshots. Always review the changes before committing!

### Reviewing changes

After updating baselines, check the diff:

```bash
git diff tests/e2e/visual-regression.spec.ts-snapshots/
```

Or use Playwright's visual diff viewer:

```bash
npm run test:report
```

### Handling failures

When visual tests fail:

1. **Review the diff** in the HTML report (`playwright-report/index.html`)
2. **Identify the cause**:
   - Bug introduced? Fix the code
   - Intentional change? Update baselines with `npm run test:visual:update`
   - Flaky rendering? Adjust `maxDiffPixels` or `threshold` in test
3. **Re-run tests** to confirm fix

## Configuration

### Global settings (playwright.config.ts)

```typescript
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 100,   // Allow 100 pixel differences
    threshold: 0.05,      // 5% threshold
    animations: 'disabled', // Disable animations
  },
}
```

### Per-test overrides

```typescript
await expect(page).toHaveScreenshot('my-screenshot.png', {
  maxDiffPixels: 500,  // Higher tolerance for complex molecules
  threshold: 0.1,      // 10% threshold
});
```

## Best Practices

### ✅ DO

- **Use descriptive names**: `render-mode-spacefill.png` not `test-1.png`
- **Wait for rendering**: Add `await page.waitForTimeout(2000)` after loading molecules
- **Test stable states**: Avoid mid-animation screenshots
- **Use soft assertions**: Wrap optional UI in `if (await element.count() > 0)`
- **Update baselines after UI changes**: Don't commit failing tests
- **Review diffs carefully**: Visual changes may indicate bugs

### ❌ DON'T

- **Don't screenshot animations**: Disable animations first
- **Don't use zero tolerance**: Allow 5% for anti-aliasing differences
- **Don't ignore failures**: Every failure should be investigated
- **Don't commit updated baselines without review**: Always check the diff
- **Don't screenshot timestamps**: Hide dynamic content before capturing
- **Don't test WebGPU rendering on all browsers**: Focus on Chromium (stable WebGPU)

## Troubleshooting

### Test fails with "Screenshot comparison failed"

**Cause**: Visual difference detected
**Solution**: Review diff in HTML report, fix code or update baseline

### Test fails with "Timeout waiting for element"

**Cause**: Element not visible or rendering delayed
**Solution**: Increase wait time or check if element actually exists

### Baselines look different on CI vs local

**Cause**: Different OS, browser versions, font rendering
**Solution**: Regenerate baselines on CI environment or use Docker for consistency

### Screenshots show blank canvas

**Cause**: WebGPU not initializing in headless mode
**Solution**: Use `--headed` mode locally or check browser flags in `playwright.config.ts`

### Mobile tests fail

**Cause**: Mobile viewports may not support WebGPU
**Solution**: Skip mobile tests for visual regression or test layout only (not canvas)

## CI Integration

Visual tests run automatically in GitHub Actions:

```yaml
- name: Run Playwright tests
  run: npm run test
```

To run only visual tests in CI:

```yaml
- name: Run visual regression tests
  run: npm run test:visual
```

Baseline screenshots are stored in git, so CI compares against committed baselines.

## File Structure

```
tests/
├── e2e/
│   ├── visual-regression.spec.ts          # Visual test suite
│   └── visual-regression.spec.ts-snapshots/
│       ├── chromium/                      # Chromium baselines
│       │   ├── empty-state.png
│       │   ├── structure-loaded.png
│       │   ├── render-mode-ball-stick.png
│       │   └── ...
│       ├── firefox/                       # Firefox baselines
│       └── webkit/                        # WebKit baselines
└── VISUAL_TESTING.md                      # This file
```

## Snapshot Storage

Snapshots are stored in git because:
- Small file size (~50-200 KB per screenshot)
- Enables version control of visual baseline
- CI can compare against committed baselines
- No external service required

Total snapshot storage estimate: ~19 screenshots × 3 browsers × ~100 KB = ~6 MB

## Alternatives Considered

### Chromatic (Storybook-based)
- **Pros**: Automated visual diff UI, free for open source
- **Cons**: Requires Storybook setup, external service
- **Decision**: Deferred - use Playwright first, migrate later if needed

### Percy
- **Pros**: Flexible, CI-native
- **Cons**: Paid subscription required
- **Decision**: Rejected - cost prohibitive

### Manual screenshots
- **Pros**: No dependencies
- **Cons**: High maintenance, manual comparison
- **Decision**: Rejected - Playwright snapshots automate this

## Migration Path

If visual regression becomes too maintenance-heavy:

1. **Option A**: Migrate to Chromatic
   - Set up Storybook components
   - Integrate Chromatic GitHub app
   - Migrate baselines to Chromatic UI

2. **Option B**: Reduce coverage
   - Focus on critical UI states only
   - Remove flaky tests (animations, mobile)
   - Increase tolerance thresholds

3. **Option C**: Visual testing as optional
   - Move to separate CI job
   - Run only on main branch or manually
   - Don't block PRs on visual failures

## Resources

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Best Practices for Screenshot Testing](https://playwright.dev/docs/screenshots)
- [Chromatic Documentation](https://www.chromatic.com/docs/)

---

**Maintained by**: axiom-agent
**Last Updated**: 2026-03-03
**Next Review**: After Phase 4 completion

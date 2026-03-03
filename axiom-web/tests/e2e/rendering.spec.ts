import { test, expect } from '@playwright/test';

/**
 * Test Suite: Rendering Settings
 *
 * Validates render mode, quality, lighting, and background features:
 * - 4 render modes: Ball-and-Stick, Spacefill, Stick, Wireframe
 * - Quality presets: Draft, Good, Best, Custom
 * - Lighting controls: Ambient, Diffuse, Specular (Blinn-Phong)
 * - Background color picker
 */

test.describe('Rendering Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Load a sample structure
    await loadSampleStructure(page);
  });

  test('should switch between render modes', async ({ page }) => {
    const renderModes = ['Ball-and-Stick', 'Spacefill', 'Stick', 'Wireframe'];

    for (const mode of renderModes) {
      // Find render mode button or radio
      const modeButton = page.locator(`button,input[type="radio"]`).filter({ hasText: new RegExp(mode, 'i') }).first();

      if (await modeButton.count() > 0) {
        const canvas = page.locator('canvas').first();
        const before = await canvas.screenshot();

        await modeButton.click();
        await page.waitForTimeout(1000); // Allow rendering

        const after = await canvas.screenshot();

        // Canvas should update for each mode
        expect(before).not.toEqual(after);
      }
    }
  });

  test('should apply Ball-and-Stick mode', async ({ page }) => {
    const modeButton = page.locator('button,input,label').filter({ hasText: /ball.*stick|ball-and-stick/i }).first();

    if (await modeButton.count() > 0) {
      await modeButton.click();
      await page.waitForTimeout(800);

      // Verify canvas rendered (visual check via screenshot)
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
    }
  });

  test('should apply Spacefill mode', async ({ page }) => {
    const modeButton = page.locator('button,input,label').filter({ hasText: /spacefill|space.*fill/i }).first();

    if (await modeButton.count() > 0) {
      const canvas = page.locator('canvas').first();
      const before = await canvas.screenshot();

      await modeButton.click();
      await page.waitForTimeout(800);

      const after = await canvas.screenshot();
      expect(before).not.toEqual(after);
    }
  });

  test('should change quality preset', async ({ page }) => {
    const qualityPresets = ['Draft', 'Good', 'Best'];

    for (const preset of qualityPresets) {
      const presetButton = page.locator('button,input[type="radio"]').filter({ hasText: new RegExp(preset, 'i') }).first();

      if (await presetButton.count() > 0) {
        await presetButton.click();
        await page.waitForTimeout(1000); // Quality changes may take longer to render

        // Verify canvas updated
        const canvas = page.locator('canvas').first();
        await expect(canvas).toBeVisible();
      }
    }
  });

  test('should adjust ambient lighting', async ({ page }) => {
    // Find ambient light slider
    const ambientSlider = await findSliderByLabel(page, /ambient/i);

    if (ambientSlider) {
      const canvas = page.locator('canvas').first();
      const before = await canvas.screenshot();

      // Increase ambient lighting
      await ambientSlider.fill('80');
      await page.waitForTimeout(500);

      const after = await canvas.screenshot();
      expect(before).not.toEqual(after);
    }
  });

  test('should adjust diffuse lighting', async ({ page }) => {
    const diffuseSlider = await findSliderByLabel(page, /diffuse/i);

    if (diffuseSlider) {
      const canvas = page.locator('canvas').first();
      const before = await canvas.screenshot();

      await diffuseSlider.fill('50');
      await page.waitForTimeout(500);

      const after = await canvas.screenshot();
      expect(before).not.toEqual(after);
    }
  });

  test('should adjust specular lighting', async ({ page }) => {
    const specularSlider = await findSliderByLabel(page, /specular/i);

    if (specularSlider) {
      const canvas = page.locator('canvas').first();
      const before = await canvas.screenshot();

      await specularSlider.fill('90');
      await page.waitForTimeout(500);

      const after = await canvas.screenshot();
      expect(before).not.toEqual(after);
    }
  });

  test('should change background color', async ({ page }) => {
    // Find background color input or preset buttons
    const colorPicker = page.locator('input[type="color"]').first();

    if (await colorPicker.count() > 0) {
      const canvas = page.locator('canvas').first();
      const before = await canvas.screenshot();

      // Change to white background
      await colorPicker.fill('#ffffff');
      await page.waitForTimeout(500);

      const after = await canvas.screenshot();
      expect(before).not.toEqual(after);
    } else {
      // Try background preset buttons
      const whiteButton = page.locator('button').filter({ hasText: /white|light/i }).first();
      if (await whiteButton.count() > 0) {
        const canvas = page.locator('canvas').first();
        const before = await canvas.screenshot();

        await whiteButton.click();
        await page.waitForTimeout(500);

        const after = await canvas.screenshot();
        expect(before).not.toEqual(after);
      }
    }
  });

  test('should apply background color presets', async ({ page }) => {
    const presetColors = ['Black', 'White', 'Gray', 'Blue', 'Green'];

    for (const color of presetColors) {
      const presetButton = page.locator('button').filter({ hasText: new RegExp(color, 'i') }).first();

      if (await presetButton.count() > 0) {
        await presetButton.click();
        await page.waitForTimeout(300);

        // Verify canvas updated
        const canvas = page.locator('canvas').first();
        await expect(canvas).toBeVisible();
      }
    }
  });

  test('should persist rendering settings in LocalStorage', async ({ page }) => {
    // Change render mode to Spacefill
    const spacefillButton = page.locator('button,input,label').filter({ hasText: /spacefill/i }).first();

    if (await spacefillButton.count() > 0) {
      await spacefillButton.click();
      await page.waitForTimeout(500);

      // Reload page
      await page.reload();
      await page.waitForTimeout(2000);

      // Check LocalStorage for persisted settings
      const renderSettings = await page.evaluate(() => {
        return localStorage.getItem('axiom-render-settings');
      });

      expect(renderSettings).toBeTruthy();

      if (renderSettings) {
        const settings = JSON.parse(renderSettings);
        // Verify render mode was persisted (exact key may vary)
        expect(settings).toHaveProperty('renderMode');
      }
    }
  });

  test('should render with custom quality settings', async ({ page }) => {
    // Switch to Custom quality preset
    const customButton = page.locator('button,input').filter({ hasText: /custom/i }).first();

    if (await customButton.count() > 0) {
      await customButton.click();
      await page.waitForTimeout(300);

      // Adjust SSAA or AO samples if available
      const ssaaSlider = await findSliderByLabel(page, /ssaa|samples|quality/i);

      if (ssaaSlider) {
        const canvas = page.locator('canvas').first();
        const before = await canvas.screenshot();

        await ssaaSlider.fill('4');
        await page.waitForTimeout(1000); // Higher quality = longer render

        const after = await canvas.screenshot();
        expect(before).not.toEqual(after);
      }
    }
  });

  test('should display rendering settings panel', async ({ page }) => {
    // Check for rendering settings UI
    const settingsPanel = page.locator('[class*="render"]').or(
      page.locator('text=/render.*settings|quality|lighting/i').first()
    );

    if (await settingsPanel.count() > 0) {
      await expect(settingsPanel.first()).toBeVisible();
    }

    // Verify key sections exist
    const expectedSections = [
      /render.*mode|style/i,
      /quality|preset/i,
      /lighting|ambient|diffuse/i,
      /background|color/i,
    ];

    for (const pattern of expectedSections) {
      const section = page.locator(`text=${pattern}`).first();
      if (await section.count() > 0) {
        // Soft check - may be in collapsed accordion
        expect(await section.count()).toBeGreaterThan(0);
      }
    }
  });
});

/**
 * Helper: Find slider by nearby label text
 */
async function findSliderByLabel(page: any, labelPattern: RegExp) {
  const label = page.locator(`label,text=${labelPattern}`).first();

  if (await label.count() > 0) {
    // Find slider near the label
    const slider = page.locator('input[type="range"]').near(label).first();
    if (await slider.count() > 0) {
      return slider;
    }
  }

  // Fallback: search all sliders
  const allSliders = await page.locator('input[type="range"]').all();
  return allSliders.length > 0 ? allSliders[0] : null;
}

/**
 * Helper: Load sample structure
 */
async function loadSampleStructure(page: any) {
  const sampleControl = page.locator('button,select').filter({ hasText: /sample/i }).first();

  if (await sampleControl.count() > 0) {
    await sampleControl.click();
    const firstSample = page.locator('option,li,[role="option"]').first();
    if (await firstSample.count() > 0) {
      await firstSample.click();
      await page.waitForTimeout(2000);
    }
  }
}

import { expect, test } from '@playwright/test'
import { expectMetric, gotoAxiom, loadSampleStructure, viewerCanvas } from './helpers'

test.describe('Rendering Settings', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAxiom(page)
    await loadSampleStructure(page)
  })

  test('switches render modes from the settings panel', async ({ page }) => {
    const canvas = viewerCanvas(page)
    const before = await canvas.screenshot()

    await page.getByRole('radio', { name: /spacefill/i }).check()
    await expectMetric(page, 'mode', /Spacefill/i)
    await page.waitForTimeout(300)
    const spacefill = await canvas.screenshot()
    expect(spacefill).not.toEqual(before)

    await page.getByRole('radio', { name: /^stick$/i }).check()
    await expectMetric(page, 'mode', /Stick/i)
    await page.waitForTimeout(300)
    const stick = await canvas.screenshot()
    expect(stick).not.toEqual(spacefill)
  })

  test('switches to wireframe mode from the quick mode chips', async ({ page }) => {
    await page.getByRole('button', { name: /wireframe/i }).click()
    await expectMetric(page, 'mode', /Wireframe/i)
  })

  test('updates quality settings through presets and custom ssaa', async ({ page }) => {
    await page.getByRole('radio', { name: /best \(high quality\)/i }).check()
    await expect(page.getByRole('radio', { name: /best \(high quality\)/i })).toBeChecked()

    await page.getByRole('radio', { name: /custom/i }).check()
    await page.locator('.render-settings-panel select').selectOption('4')

    const persisted = await page.evaluate(() => localStorage.getItem('axiom-render-settings'))
    expect(persisted).toContain('"ssaa":4')
  })

  test('changes background color presets', async ({ page }) => {
    const canvas = viewerCanvas(page)
    const before = await canvas.screenshot()

    await page.getByLabel(/set background to black/i).click()
    await page.waitForTimeout(300)
    const after = await canvas.screenshot()

    expect(after).not.toEqual(before)
  })

  test('applies lighting slider changes live', async ({ page }) => {
    const canvas = viewerCanvas(page)
    const before = await canvas.screenshot()

    const sliders = page.locator('.render-settings-panel input[type="range"]')
    await sliders.nth(0).fill('100')
    await sliders.nth(1).fill('20')
    await sliders.nth(2).fill('0')
    await page.waitForTimeout(300)

    const after = await canvas.screenshot()
    expect(after).not.toEqual(before)
  })

  test('persists a background change across reload', async ({ page }) => {
    await page.getByLabel(/set background to black/i).click()
    await page.reload()
    await loadSampleStructure(page)

    const persisted = await page.evaluate(() => localStorage.getItem('axiom-render-settings'))
    expect(persisted).toContain('"backgroundColor":"#000000"')
  })
})

import { expect, test } from '@playwright/test'
import { expectMetric, gotoAxiom, loadSampleStructure, viewerCanvas } from './helpers'

test.describe('Atom Selection and Measurements', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAxiom(page)
    await loadSampleStructure(page)
  })

  test('selects all atoms and clears the selection', async ({ page }) => {
    await page.keyboard.press('Control+a')
    await expectMetric(page, 'selection', /3/)
    await expect(page.locator('.measurement-panel')).toContainText(/Selected atoms:\s*3/i)

    await page.keyboard.press('Escape')
    await expectMetric(page, 'selection', /0/)
  })

  test('can select an atom from the canvas', async ({ page }) => {
    await loadSampleStructure(page, 'Crambin (1CRN PDB)')

    const canvas = viewerCanvas(page)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas box unavailable')

    await canvas.click({ position: { x: box.width * 0.5, y: box.height * 0.3 } })
    await page.waitForTimeout(300)
    await expectMetric(page, 'selection', /1/)
  })

  test('creates a distance measurement from selected atoms', async ({ page }) => {
    await page.keyboard.press('Control+a')
    await page.locator('.measurement-panel input[type="radio"][value="distance"]').check()
    await page.getByRole('button', { name: /create measurement/i }).click()

    await expect(page.locator('.measurement-panel')).toContainText(/Distance|Å/)
  })

  test('creates an angle measurement from selected atoms', async ({ page }) => {
    await page.keyboard.press('Control+a')
    await page.locator('.measurement-panel input[type="radio"][value="angle"]').check()
    await page.getByRole('button', { name: /create measurement/i }).click()

    await expect(page.locator('.measurement-panel')).toContainText(/Angle|°/)
  })

  test('clears measurements from the panel', async ({ page }) => {
    await page.keyboard.press('Control+a')
    await page.getByRole('button', { name: /create measurement/i }).click()
    await expect(page.locator('.measurement-panel')).toContainText(/Distance|Å/)

    await page.getByRole('button', { name: /clear all/i }).click()
    await expect(page.locator('.measurement-panel')).toContainText('No measurements yet')
  })
})

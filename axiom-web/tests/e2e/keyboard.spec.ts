import { expect, test } from '@playwright/test'
import { expectMetric, gotoAxiom, loadSampleStructure, viewerCanvas } from './helpers'

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAxiom(page)
    await loadSampleStructure(page)
  })

  test('opens the hidden file input with Ctrl+O availability', async ({ page }) => {
    await page.keyboard.press('Control+o')
    await expect(page.locator('input[type="file"]').first()).toHaveAttribute('accept', '.cif,.mcif,.pdb,.ent,.xyz')
  })

  test('switches render modes with number keys', async ({ page }) => {
    await page.keyboard.press('2')
    await expectMetric(page, 'mode', /Spacefill/i)

    await page.keyboard.press('3')
    await expectMetric(page, 'mode', /Stick/i)

    await page.keyboard.press('4')
    await expectMetric(page, 'mode', /Wireframe/i)

    await page.keyboard.press('1')
    await expectMetric(page, 'mode', /Ball & Stick/i)
  })

  test('fits and resets the camera with F and R', async ({ page }) => {
    const canvas = viewerCanvas(page)
    const before = await canvas.screenshot()

    await canvas.hover()
    await page.mouse.wheel(0, -500)
    await page.waitForTimeout(300)
    const zoomed = await canvas.screenshot()
    expect(zoomed).not.toEqual(before)

    await page.keyboard.press('f')
    await expect(page.getByTestId('status-message')).toContainText(/fitted|fit/i)

    await page.keyboard.press('r')
    await expect(page.getByTestId('status-message')).toContainText(/reset|home view/i)
  })

  test('selects all atoms with Ctrl+A and clears with Escape', async ({ page }) => {
    await page.keyboard.press('Control+a')
    await expectMetric(page, 'selection', /3/)

    await page.keyboard.press('Escape')
    await expectMetric(page, 'selection', /0/)
  })

  test('toggles measurement mode with M', async ({ page }) => {
    await page.keyboard.press('m')
    await expect(page.getByTestId('measurement-mode-state')).toContainText(/measurement mode enabled/i)

    await page.keyboard.press('m')
    await expect(page.getByTestId('measurement-mode-state')).toContainText(/direct manipulation enabled/i)
  })

  test('opens keyboard shortcut help with question mark', async ({ page }) => {
    await page.keyboard.press('Shift+/')
    await expect(page.getByRole('dialog')).toContainText('Keyboard Shortcuts')
    await expect(page.getByRole('dialog')).toContainText('Ctrl')

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('keeps export panel reachable with Ctrl+E and Ctrl+S shortcuts', async ({ page }) => {
    await page.keyboard.press('Control+e')
    await expect(page.getByTestId('status-message')).toContainText(/export panel/i)

    await page.keyboard.press('Control+s')
    await expect(page.getByTestId('status-message')).toContainText(/export panel/i)
  })
})

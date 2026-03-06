import { expect, test } from '@playwright/test'

test('recovers from stale render settings persisted in localStorage', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'axiom-render-settings',
      JSON.stringify({
        quality: { preset: 'good', ssaa: 2, aoSamples: 8 },
      }),
    )
  })

  await page.goto('/')

  await expect(page.getByText('Axiom Molecular Workbench')).toBeVisible()
  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.locator('body')).not.toContainText('Something went wrong')
  await expect(page.locator('body')).not.toContainText('Renderer Error')

  await page.getByRole('button', { name: /load example structure/i }).click()
  await page.getByText('Water (CIF)', { exact: true }).click()

  await expect(page.getByTestId('structure-info')).toContainText('File: Water (CIF)')
  await expect(page.getByTestId('structure-info')).toContainText(/Atoms:\s*3/)
  await expect(page.locator('body')).not.toContainText('Something went wrong')
})

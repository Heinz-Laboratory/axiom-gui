import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const quartzFixture = fileURLToPath(new URL('../../public/samples/quartz.cif', import.meta.url))

test('loads samples and uploads on production without runtime failures', async ({ page }, testInfo) => {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })

  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  await page.goto('/')
  await expect(page.getByText('Axiom Molecular Workbench')).toBeVisible()
  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.locator('body')).not.toContainText('Renderer Error')

  await page.getByRole('button', { name: /load example structure/i }).click()
  await page.getByText('Water (CIF)', { exact: true }).click()
  await expect(page.getByTestId('structure-info')).toContainText('File: Water (CIF)')
  await expect(page.getByTestId('structure-info')).toContainText(/Atoms:\s*3/)
  await expect(page.getByTestId('structure-info')).toContainText(/Bonds:\s*2/)
  await expect(page.locator('body')).not.toContainText('Renderer Error')

  await page.locator('input[type="file"]').first().setInputFiles(quartzFixture)
  await expect(page.getByTestId('structure-info')).toContainText('File: quartz.cif')
  await expect(page.getByTestId('structure-info')).toContainText(/Atoms:\s*9/)
  await expect(page.getByTestId('structure-info')).toContainText(/Bonds:\s*6/)
  await expect(page.locator('body')).not.toContainText('Renderer Error')

  await page.screenshot({
    path: testInfo.outputPath('production-cif-validation.png'),
    fullPage: true,
  })

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})

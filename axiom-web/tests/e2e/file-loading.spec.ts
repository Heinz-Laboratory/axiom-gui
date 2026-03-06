import { expect, test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const quartzFixture = fileURLToPath(new URL('../../public/samples/quartz.cif', import.meta.url))
const ethanolFixture = fileURLToPath(new URL('../../public/samples/ethanol.xyz', import.meta.url))

async function expectViewerReady(page: Page) {
  await expect(page.getByTestId('app-shell-header')).toContainText('Axiom Molecular Workbench')
  await expect(page.getByTestId('viewer-canvas')).toBeVisible()
}

async function loadSample(page: Page, label: string) {
  await page.getByRole('button', { name: /load example structure/i }).click()
  await expect(page.getByText(label, { exact: true })).toBeVisible()
  await page.getByText(label, { exact: true }).click()
  await expect(page.locator('body')).not.toContainText('Renderer Error')
  await expect(page.getByTestId('structure-info')).toContainText('Structure summary')
}

async function expectStructureSummary(page: Page, checks: {
  file: string
  atoms: number
  bonds?: number
  contains?: Array<string | RegExp>
}) {
  const info = page.getByTestId('structure-info')
  await expect(info).toContainText(`File: ${checks.file}`)
  await expect(info).toContainText(new RegExp(`Atoms:\\s*${checks.atoms}`))
  if (typeof checks.bonds === 'number') {
    await expect(info).toContainText(new RegExp(`Bonds:\\s*${checks.bonds}`))
  }

  for (const item of checks.contains ?? []) {
    await expect(info).toContainText(item)
  }
}

test.describe('File Loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expectViewerReady(page)
  })

  test('shows the empty state before any structure is loaded', async ({ page }) => {
    await expect(page.getByTestId('structure-info')).toContainText('No structure loaded')
  })

  test('loads the Water CIF sample and updates the canvas + metadata', async ({ page }) => {
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

    const canvas = page.getByTestId('viewer-canvas')
    const beforeLoad = await canvas.screenshot()

    await loadSample(page, 'Water (CIF)')
    await expectStructureSummary(page, {
      file: 'Water (CIF)',
      atoms: 3,
      bonds: 2,
      contains: [/H\s*2/, /O\s*1/],
    })

    const afterLoad = await canvas.screenshot()
    expect(afterLoad).not.toEqual(beforeLoad)
    expect(pageErrors).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('uploads a CIF file through the hidden file input and shows structure details', async ({ page }) => {
    const hiddenFileInput = page.locator('input[type="file"]').first()
    await hiddenFileInput.setInputFiles(quartzFixture)

    await expectStructureSummary(page, {
      file: 'quartz.cif',
      atoms: 9,
      bonds: 6,
      contains: [/Si\s*3/, /O\s*6/],
    })
    await expect(page.locator('body')).not.toContainText('Renderer Error')
  })

  test('uploads an XYZ file and infers bonds from coordinates', async ({ page }) => {
    const hiddenFileInput = page.locator('input[type="file"]').first()
    await hiddenFileInput.setInputFiles(ethanolFixture)

    await expectStructureSummary(page, {
      file: 'ethanol.xyz',
      atoms: 9,
      bonds: 8,
      contains: [/C\s*2/, /H\s*6/, /O\s*1/],
    })
    await expect(page.locator('body')).not.toContainText('Renderer Error')
  })

  test('loads a real PDB sample from RCSB without crashing', async ({ page }) => {
    await loadSample(page, 'Crambin (1CRN PDB)')

    await expectStructureSummary(page, {
      file: 'Crambin (1CRN PDB)',
      atoms: 327,
    })
    await expect(page.locator('body')).not.toContainText('Renderer Error')
    await expect(page.locator('body')).not.toContainText('Failed to load')
  })

  test('uses explicit PDB CONECT bonds when present', async ({ page }) => {
    const hiddenFileInput = page.locator('input[type="file"]').first()
    await hiddenFileInput.setInputFiles({
      name: 'water.pdb',
      mimeType: 'chemical/x-pdb',
      buffer: Buffer.from(`ATOM      1  O   WAT A   1       0.000   0.000   0.000  1.00  0.00           O
ATOM      2  H1  WAT A   1       0.757   0.586   0.000  1.00  0.00           H
ATOM      3  H2  WAT A   1      -0.757   0.586   0.000  1.00  0.00           H
CONECT    1    2    3
END
`),
    })

    await expectStructureSummary(page, {
      file: 'water.pdb',
      atoms: 3,
      bonds: 2,
    })
    await expect(page.locator('body')).not.toContainText('Renderer Error')
  })

  test('ignores anisotropic atom_site loops when uploading CIF files', async ({ page }) => {
    const hiddenFileInput = page.locator('input[type="file"]').first()
    await hiddenFileInput.setInputFiles({
      name: 'aniso.cif',
      mimeType: 'chemical/x-cif',
      buffer: Buffer.from(`data_aniso
_cell_length_a    10.000
_cell_length_b    10.000
_cell_length_c    10.000
_cell_angle_alpha 90.0
_cell_angle_beta  90.0
_cell_angle_gamma 90.0

loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
C1 C 0.0 0.0 0.0
O1 O 0.5 0.5 0.5

loop_
_atom_site_aniso_label
_atom_site_aniso_U_11
_atom_site_aniso_U_22
_atom_site_aniso_U_33
C1 0.012 0.013 0.014
O1 0.021 0.022 0.023`),
    })

    await expectStructureSummary(page, {
      file: 'aniso.cif',
      atoms: 2,
      bonds: 0,
    })
    await expect(page.locator('body')).not.toContainText('Renderer Error')
    await expect(page.locator('body')).not.toContainText('Failed to load')
  })

  test('rejects invalid file extensions before parsing', async ({ page }) => {
    const hiddenFileInput = page.locator('input[type="file"]').first()
    await hiddenFileInput.setInputFiles({
      name: 'not-a-structure.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('plain text, not a structure file'),
    })

    await expect(page.locator('body')).toContainText('Invalid file type. Expected .cif,.mcif,.pdb,.ent,.xyz')
    await expect(page.getByTestId('structure-info')).toContainText('No structure loaded')
  })
})

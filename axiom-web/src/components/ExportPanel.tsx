import { useEffect, useMemo, useState } from 'react'
import type { WasmRenderer } from '../wasm/axiom-renderer'
import '../styles/ExportPanel.css'

interface ExportPanelProps {
  renderer: WasmRenderer | null
  structureName: string
  onBusyChange?: (busy: boolean) => void
}

type ExportType = 'png' | 'structure' | 'scene'
type Resolution = '1080p' | '4k' | '8k' | 'custom'
type StructureFormat = 'pdb' | 'xyz' | 'cif'
type RenderQuality = 'draft' | 'good' | 'best'

const RESOLUTIONS = {
  '1080p': { width: 1920, height: 1080, label: '1080p (1920×1080)' },
  '4k': { width: 3840, height: 2160, label: '4K (3840×2160)' },
  '8k': { width: 7680, height: 4320, label: '8K (7680×4320)' },
  custom: { width: 1920, height: 1080, label: 'Custom' },
} as const

const QUALITY_LABELS: Record<RenderQuality, string> = {
  draft: 'Draft (1x SSAA)',
  good: 'Good (2x SSAA)',
  best: 'Best (4x SSAA)',
}

const QUALITY_ORDER: RenderQuality[] = ['best', 'good', 'draft']

function getSsaaMultiplier(quality: RenderQuality) {
  switch (quality) {
    case 'draft':
      return 1
    case 'good':
      return 2
    case 'best':
      return 4
  }
}

function supportsExport(limit: number | null, width: number, height: number, quality: RenderQuality) {
  if (!limit) return true
  const ssaa = getSsaaMultiplier(quality)
  return width * ssaa <= limit && height * ssaa <= limit
}

function highestSupportedQuality(limit: number | null, width: number, height: number) {
  for (const preset of QUALITY_ORDER) {
    if (supportsExport(limit, width, height, preset)) {
      return preset
    }
  }
  return null
}

export function ExportPanel({ renderer, structureName, onBusyChange }: ExportPanelProps) {
  const [exportType, setExportType] = useState<ExportType>('png')
  const [resolution, setResolution] = useState<Resolution>('1080p')
  const [quality, setQuality] = useState<RenderQuality>('good')
  const [customWidth, setCustomWidth] = useState(1920)
  const [customHeight, setCustomHeight] = useState(1080)
  const [structureFormat, setStructureFormat] = useState<StructureFormat>('pdb')
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')
  const [maxTextureDimension, setMaxTextureDimension] = useState<number | null>(null)

  const selectedResolution = useMemo(() => (
    resolution === 'custom'
      ? { width: customWidth, height: customHeight, label: 'Custom' }
      : RESOLUTIONS[resolution]
  ), [customHeight, customWidth, resolution])

  const resolutionSupport = useMemo(() => ({
    '1080p': highestSupportedQuality(maxTextureDimension, RESOLUTIONS['1080p'].width, RESOLUTIONS['1080p'].height),
    '4k': highestSupportedQuality(maxTextureDimension, RESOLUTIONS['4k'].width, RESOLUTIONS['4k'].height),
    '8k': highestSupportedQuality(maxTextureDimension, RESOLUTIONS['8k'].width, RESOLUTIONS['8k'].height),
  }), [maxTextureDimension])

  const bestQualityForSelection = useMemo(() => (
    highestSupportedQuality(maxTextureDimension, selectedResolution.width, selectedResolution.height)
  ), [maxTextureDimension, selectedResolution.height, selectedResolution.width])

  const qualitySupported = supportsExport(
    maxTextureDimension,
    selectedResolution.width,
    selectedResolution.height,
    quality,
  )

  useEffect(() => {
    if (!renderer) {
      setMaxTextureDimension(null)
      return
    }

    try {
      setMaxTextureDimension(renderer.get_max_texture_dimension_2d())
    } catch {
      setMaxTextureDimension(null)
    }
  }, [renderer])

  useEffect(() => {
    if (bestQualityForSelection && !qualitySupported) {
      setQuality(bestQualityForSelection)
    }
  }, [bestQualityForSelection, qualitySupported])

  const handleExportPNG = async () => {
    if (!renderer) return

    if (!bestQualityForSelection) {
      setError(
        maxTextureDimension
          ? `This GPU export limit is ${maxTextureDimension}px. Lower the resolution before exporting.`
          : 'This resolution is not supported on the current GPU.',
      )
      return
    }

    setIsExporting(true)
    setError('')
    onBusyChange?.(true)

    try {
      const pngBytes = await renderer.export_png(selectedResolution.width, selectedResolution.height, quality)
      const normalizedBytes = new Uint8Array(pngBytes.byteLength)
      normalizedBytes.set(pngBytes)
      const blob = new Blob([normalizedBytes.buffer], { type: 'image/png' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${structureName || 'molecule'}_${selectedResolution.width}x${selectedResolution.height}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
      onBusyChange?.(false)
    }
  }

  const handleExportStructure = () => {
    if (!renderer) return

    setIsExporting(true)
    setError('')

    try {
      let content: string
      let extension: string

      switch (structureFormat) {
        case 'pdb':
          content = renderer.export_pdb(structureName || 'molecule')
          extension = 'pdb'
          break
        case 'xyz':
          content = renderer.export_xyz(structureName || 'molecule')
          extension = 'xyz'
          break
        case 'cif':
          content = renderer.export_cif(structureName || 'molecule')
          extension = 'cif'
          break
      }

      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${structureName || 'molecule'}.${extension}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportScene = () => {
    if (!renderer) return

    setIsExporting(true)
    setError('')

    try {
      const cameraState = renderer.get_camera_state()
      const sceneData = {
        version: '0.3.0',
        timestamp: new Date().toISOString(),
        structureName: structureName || 'molecule',
        camera: JSON.parse(cameraState),
        cameraState: JSON.parse(cameraState),
        renderSettings: {},
      }

      const blob = new Blob([JSON.stringify(sceneData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${structureName || 'molecule'}_scene.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleLoadScene = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file || !renderer) return

      try {
        const text = await file.text()
        const sceneData = JSON.parse(text)
        const cam = sceneData.cameraState ?? sceneData.camera
        if (cam?.eye && cam?.target) {
          renderer.set_camera_position(
            cam.eye[0], cam.eye[1], cam.eye[2],
            cam.target[0], cam.target[1], cam.target[2],
          )
        }
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load scene')
      }
    }
    input.click()
  }

  const isDisabled = !renderer || isExporting

  return (
    <section className="export-panel">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">Output</span>
          <h3>Export</h3>
        </div>
      </div>

      <div className="export-tabs">
        <button className={exportType === 'png' ? 'active' : ''} onClick={() => setExportType('png')}>
          PNG Image
        </button>
        <button className={exportType === 'structure' ? 'active' : ''} onClick={() => setExportType('structure')}>
          Structure File
        </button>
        <button className={exportType === 'scene' ? 'active' : ''} onClick={() => setExportType('scene')}>
          Scene
        </button>
      </div>

      {error && <div className="export-error">{error}</div>}

      {exportType === 'png' && (
        <div className="export-options">
          <p className="scene-description">
            Generate a still image from the current stage using the live render settings.
          </p>

          <div className="form-group">
            <label>Resolution</label>
            <select value={resolution} onChange={(e) => setResolution(e.target.value as Resolution)}>
              <option value="1080p">{RESOLUTIONS['1080p'].label}</option>
              <option value="4k" disabled={!resolutionSupport['4k']}>{RESOLUTIONS['4k'].label}</option>
              <option value="8k" disabled={!resolutionSupport['8k']}>{RESOLUTIONS['8k'].label}</option>
              <option value="custom">{RESOLUTIONS.custom.label}</option>
            </select>
          </div>

          <div className="form-group">
            <label>Quality</label>
            <select value={quality} onChange={(e) => setQuality(e.target.value as RenderQuality)}>
              <option value="draft">{QUALITY_LABELS.draft}</option>
              <option
                value="good"
                disabled={!supportsExport(maxTextureDimension, selectedResolution.width, selectedResolution.height, 'good')}
              >
                {QUALITY_LABELS.good}
              </option>
              <option
                value="best"
                disabled={!supportsExport(maxTextureDimension, selectedResolution.width, selectedResolution.height, 'best')}
              >
                {QUALITY_LABELS.best}
              </option>
            </select>
          </div>

          {maxTextureDimension && (
            <p className="scene-description">
              GPU export limit: {maxTextureDimension}px. Current selection uses {getSsaaMultiplier(quality)}x SSAA.
              {!bestQualityForSelection && ' Lower the resolution to enable PNG export on this device.'}
            </p>
          )}

          {resolution === 'custom' && (
            <div className="custom-resolution">
              <div className="form-group">
                <label>Width (px)</label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Number(e.target.value))}
                  min={640}
                  max={15360}
                />
              </div>
              <div className="form-group">
                <label>Height (px)</label>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Number(e.target.value))}
                  min={480}
                  max={8640}
                />
              </div>
            </div>
          )}

          <button className="export-button primary" onClick={handleExportPNG} disabled={isDisabled || !bestQualityForSelection}>
            {isExporting ? 'Exporting...' : 'Export PNG'}
          </button>
        </div>
      )}

      {exportType === 'structure' && (
        <div className="export-options">
          <p className="scene-description">
            Save the currently loaded structure back out as a transportable text format.
          </p>

          <div className="form-group">
            <label>Format</label>
            <select value={structureFormat} onChange={(e) => setStructureFormat(e.target.value as StructureFormat)}>
              <option value="pdb">PDB (.pdb)</option>
              <option value="xyz">XYZ (.xyz)</option>
              <option value="cif">CIF (.cif)</option>
            </select>
          </div>

          <div className="format-info">
            {structureFormat === 'pdb' && <p>Protein Data Bank format with ATOM records and fixed-width columns.</p>}
            {structureFormat === 'xyz' && <p>Simple Cartesian coordinates format with inferred bonding downstream.</p>}
            {structureFormat === 'cif' && <p>Crystallographic Information File including fractional coordinate conventions.</p>}
          </div>

          <button className="export-button primary" onClick={handleExportStructure} disabled={isDisabled}>
            Export {structureFormat.toUpperCase()}
          </button>
        </div>
      )}

      {exportType === 'scene' && (
        <div className="export-options">
          <p className="scene-description">
            Save or reload the current camera framing as a lightweight scene state.
          </p>

          <div className="scene-buttons">
            <button className="export-button primary" onClick={handleExportScene} disabled={isDisabled}>
              Export Scene JSON
            </button>
            <button className="export-button secondary" onClick={handleLoadScene} disabled={isDisabled}>
              Load Scene JSON
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

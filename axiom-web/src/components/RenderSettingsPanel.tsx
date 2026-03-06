import { useRenderSettings } from '../contexts/RenderSettingsContext'
import type { QualityPreset } from '../types/render-settings'
import { QUALITY_PRESETS, BACKGROUND_PRESETS } from '../types/render-settings'
import './RenderSettingsPanel.css'

const RENDER_MODE_OPTIONS = [
  {
    value: 'ball-and-stick',
    label: 'Ball & Stick',
    caption: 'Balanced structure overview',
  },
  {
    value: 'spacefill',
    label: 'Spacefill',
    caption: 'Van der Waals envelope',
  },
  {
    value: 'stick',
    label: 'Stick',
    caption: 'Compact bond-first representation',
  },
  {
    value: 'wireframe',
    label: 'Wireframe',
    caption: 'Minimal skeletal view',
  },
] as const

const QUALITY_OPTIONS: Array<{ value: QualityPreset; label: string; caption: string }> = [
  { value: 'draft', label: 'Draft (Fast)', caption: 'Quick navigation and checks' },
  { value: 'good', label: 'Good (Balanced)', caption: 'Default review preset' },
  { value: 'best', label: 'Best (High Quality)', caption: 'Higher fidelity stills' },
  { value: 'custom', label: 'Custom', caption: 'Manual SSAA and AO control' },
]

export function RenderSettingsPanel() {
  const {
    settings,
    updateRenderMode,
    updateQuality,
    updateLighting,
    updateBackgroundColor,
    resetToDefaults,
  } = useRenderSettings()

  const handleRenderModeChange = (mode: string) => {
    switch (mode) {
      case 'ball-and-stick':
        updateRenderMode({ type: 'ball-and-stick', atomScale: 1.0, bondRadius: 0.15 })
        break
      case 'spacefill':
        updateRenderMode({ type: 'spacefill', vdwScale: 1.5 })
        break
      case 'stick':
        updateRenderMode({ type: 'stick', atomRadius: 0.2, bondRadius: 0.15 })
        break
      case 'wireframe':
        updateRenderMode({ type: 'wireframe', lineWidth: 0.1 })
        break
    }
  }

  const handleQualityPresetChange = (preset: QualityPreset) => {
    if (preset === 'custom') {
      updateQuality({ preset: 'custom', ssaa: settings.quality.ssaa, aoSamples: settings.quality.aoSamples })
      return
    }

    const config = QUALITY_PRESETS[preset]
    updateQuality({ preset, ssaa: config.ssaa, aoSamples: config.aoSamples })
  }

  const handleCustomQualityChange = (ssaa?: number, aoSamples?: number) => {
    updateQuality({
      preset: 'custom',
      ssaa: (ssaa as 1 | 2 | 4) ?? settings.quality.ssaa,
      aoSamples: aoSamples ?? settings.quality.aoSamples,
    })
  }

  const handleLightingChange = (component: 'ambient' | 'diffuse' | 'specular', value: number) => {
    updateLighting({
      ...settings.lighting,
      [component]: value,
    })
  }

  return (
    <section className="render-settings-panel">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">Appearance</span>
          <h3>Rendering settings</h3>
        </div>
        <button onClick={resetToDefaults} className="reset-all-button">
          Reset All to Defaults
        </button>
      </div>

      <section className="settings-section">
        <div className="settings-section__head">
          <h4>Render style</h4>
          <p>Choose the structural representation that best matches the task.</p>
        </div>
        <div className="choice-grid radio-group">
          {RENDER_MODE_OPTIONS.map((option) => (
            <label key={option.value} className={`choice-card ${settings.renderMode.type === option.value ? 'is-active' : ''}`}>
              <input
                type="radio"
                name="renderMode"
                value={option.value}
                checked={settings.renderMode.type === option.value}
                onChange={(e) => handleRenderModeChange(e.target.value)}
              />
              <span className="choice-card__label">{option.label}</span>
              <span className="choice-card__caption">{option.caption}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section__head">
          <h4>Quality</h4>
          <p>Balance interaction speed against still-image fidelity.</p>
        </div>
        <div className="choice-grid radio-group">
          {QUALITY_OPTIONS.map((option) => (
            <label key={option.value} className={`choice-card ${settings.quality.preset === option.value ? 'is-active' : ''}`}>
              <input
                type="radio"
                name="quality"
                value={option.value}
                checked={settings.quality.preset === option.value}
                onChange={(e) => handleQualityPresetChange(e.target.value as QualityPreset)}
              />
              <span className="choice-card__label">{option.label}</span>
              <span className="choice-card__caption">{option.caption}</span>
            </label>
          ))}
        </div>

        {settings.quality.preset === 'custom' && (
          <div className="sliders sliders--custom-quality">
            <label>
              <span>SSAA: {settings.quality.ssaa}x</span>
              <select
                value={settings.quality.ssaa}
                onChange={(e) => handleCustomQualityChange(Number(e.target.value), undefined)}
              >
                <option value="1">1x</option>
                <option value="2">2x</option>
                <option value="4">4x</option>
              </select>
            </label>
            <label>
              <span>AO Samples: {settings.quality.aoSamples}</span>
              <input
                type="range"
                min="0"
                max="32"
                step="4"
                value={settings.quality.aoSamples}
                onChange={(e) => handleCustomQualityChange(undefined, Number(e.target.value))}
              />
            </label>
          </div>
        )}
      </section>

      <section className="settings-section">
        <div className="settings-section__head">
          <h4>Lighting</h4>
          <p>Adjust material read and depth cues directly in the viewport.</p>
        </div>
        <div className="sliders">
          <label>
            <span>Ambient: {settings.lighting.ambient}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.lighting.ambient}
              onChange={(e) => handleLightingChange('ambient', Number(e.target.value))}
            />
          </label>
          <label>
            <span>Diffuse: {settings.lighting.diffuse}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.lighting.diffuse}
              onChange={(e) => handleLightingChange('diffuse', Number(e.target.value))}
            />
          </label>
          <label>
            <span>Specular: {settings.lighting.specular}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.lighting.specular}
              onChange={(e) => handleLightingChange('specular', Number(e.target.value))}
            />
          </label>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section__head">
          <h4>Background</h4>
          <p>Keep the canvas light and printable or switch to higher-contrast review presets.</p>
        </div>
        <div className="color-presets">
          {BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.color}
              className={`color-swatch ${settings.backgroundColor === preset.color ? 'active' : ''}`}
              style={{ backgroundColor: preset.color }}
              onClick={() => updateBackgroundColor(preset.color)}
              title={preset.name}
              aria-label={`Set background to ${preset.name}`}
            />
          ))}
          <input
            type="color"
            value={settings.backgroundColor}
            onChange={(e) => updateBackgroundColor(e.target.value)}
            className="color-picker"
            title="Custom color"
          />
        </div>
      </section>
    </section>
  )
}

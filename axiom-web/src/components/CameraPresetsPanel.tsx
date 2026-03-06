import { useState } from 'react'
import './CameraPresetsPanel.css'

interface CameraPreset {
  name: string
  key: string
  axis: string
}

const BUILTIN_PRESETS: CameraPreset[] = [
  { name: 'Front', key: 'front', axis: '+Z' },
  { name: 'Back', key: 'back', axis: '−Z' },
  { name: 'Left', key: 'left', axis: '−X' },
  { name: 'Right', key: 'right', axis: '+X' },
  { name: 'Top', key: 'top', axis: '+Y' },
  { name: 'Bottom', key: 'bottom', axis: '−Y' },
]

interface CameraState {
  position: [number, number, number]
  target: [number, number, number]
  up: [number, number, number]
  fov: number
}

interface CameraPresetsProps {
  onPresetClick: (preset: string) => void
  onSavePreset: (name: string, state: CameraState) => void
  onLoadPreset: (state: CameraState) => void
  getCurrentState: () => CameraState | null
  customPresets: Record<string, CameraState>
  onDeletePreset: (name: string) => void
}

export function CameraPresetsPanel({
  onPresetClick,
  onSavePreset,
  onLoadPreset,
  getCurrentState,
  customPresets,
  onDeletePreset,
}: CameraPresetsProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handlePresetClick = (key: string) => {
    setActivePreset(key)
    onPresetClick(key)
    setTimeout(() => setActivePreset(null), 500)
  }

  const handleSaveClick = () => {
    if (!presetName.trim()) {
      setError('Please enter a preset name')
      return
    }

    const state = getCurrentState()
    if (!state) {
      setError('Camera state is unavailable')
      return
    }

    onSavePreset(presetName.trim(), state)
    setPresetName('')
    setIsSaving(false)
    setError(null)
  }

  const handleLoadCustom = (key: string) => {
    const state = customPresets[key]
    if (state) {
      onLoadPreset(state)
      setActivePreset(`custom-${key}`)
      setTimeout(() => setActivePreset(null), 500)
    }
  }

  return (
    <section className="camera-presets-panel">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">Views</span>
          <h3>Camera presets</h3>
        </div>
      </div>

      <div className="preset-grid">
        {BUILTIN_PRESETS.map((preset) => (
          <button
            key={preset.key}
            className={`preset-btn ${activePreset === preset.key ? 'active' : ''}`}
            onClick={() => handlePresetClick(preset.key)}
            title={`View from ${preset.name.toLowerCase()}`}
            aria-label={`Camera preset: ${preset.name}`}
          >
            <span className="preset-axis">{preset.axis}</span>
            <span className="preset-name">{preset.name}</span>
          </button>
        ))}
      </div>

      {Object.keys(customPresets).length > 0 && (
        <div className="custom-presets">
          <h4>Saved views</h4>
          {Object.entries(customPresets).map(([key]) => (
            <div key={key} className="custom-preset-item">
              <button
                className={`preset-btn ${activePreset === `custom-${key}` ? 'active' : ''}`}
                onClick={() => handleLoadCustom(key)}
              >
                <span className="preset-axis">Save</span>
                <span className="preset-name">{key}</span>
              </button>
              <button
                className="delete-btn"
                onClick={() => onDeletePreset(key)}
                title="Delete preset"
                aria-label={`Delete preset ${key}`}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="save-preset-section">
        {!isSaving ? (
          <button className="save-preset-btn" onClick={() => setIsSaving(true)}>
            Save Current View
          </button>
        ) : (
          <div className="save-preset-form">
            <input
              type="text"
              placeholder="Preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveClick()}
              autoFocus
            />
            <div className="save-preset-form__actions">
              <button onClick={handleSaveClick}>Save</button>
              <button onClick={() => setIsSaving(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {error && <div className="camera-presets-panel__error">{error}</div>}
    </section>
  )
}

import { useState } from 'react'
import './CameraPresetsPanel.css'

interface CameraPreset {
  name: string
  key: string
  icon: string
}

const BUILTIN_PRESETS: CameraPreset[] = [
  { name: 'Front', key: 'front', icon: '⬆️' },
  { name: 'Back', key: 'back', icon: '⬇️' },
  { name: 'Left', key: 'left', icon: '⬅️' },
  { name: 'Right', key: 'right', icon: '➡️' },
  { name: 'Top', key: 'top', icon: '⏫' },
  { name: 'Bottom', key: 'bottom', icon: '⏬' },
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

  const handlePresetClick = (key: string) => {
    setActivePreset(key)
    onPresetClick(key)

    // Clear active state after animation (500ms)
    setTimeout(() => setActivePreset(null), 500)
  }

  const handleSaveClick = () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name')
      return
    }

    const state = getCurrentState()
    if (!state) {
      alert('Cannot save preset - no camera state available')
      return
    }

    onSavePreset(presetName.trim(), state)
    setPresetName('')
    setIsSaving(false)
  }

  const handleLoadCustom = (key: string) => {
    const state = customPresets[key]
    if (state) {
      onLoadPreset(state)
      setActivePreset(`custom-${key}`)
      setTimeout(() => setActivePreset(null), 500)
    }
  }

  const handleDeleteCustom = (key: string) => {
    if (confirm(`Delete preset "${key}"?`)) {
      onDeletePreset(key)
    }
  }

  return (
    <div className="camera-presets-panel">
      <h3>Camera Presets</h3>

      {/* Built-in presets */}
      <div className="preset-grid">
        {BUILTIN_PRESETS.map((preset) => (
          <button
            key={preset.key}
            className={`preset-btn ${activePreset === preset.key ? 'active' : ''}`}
            onClick={() => handlePresetClick(preset.key)}
            title={`View from ${preset.name.toLowerCase()}`}
            aria-label={`Camera preset: ${preset.name}`}
          >
            <span className="preset-icon">{preset.icon}</span>
            <span className="preset-name">{preset.name}</span>
          </button>
        ))}
      </div>

      {/* Custom presets */}
      {Object.keys(customPresets).length > 0 && (
        <div className="custom-presets">
          <h4>Custom Presets</h4>
          {Object.entries(customPresets).map(([key]) => (
            <div key={key} className="custom-preset-item">
              <button
                className={`preset-btn ${activePreset === `custom-${key}` ? 'active' : ''}`}
                onClick={() => handleLoadCustom(key)}
              >
                📌 {key}
              </button>
              <button
                className="delete-btn"
                onClick={() => handleDeleteCustom(key)}
                title="Delete preset"
                aria-label={`Delete preset ${key}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Save new preset */}
      <div className="save-preset-section">
        {!isSaving ? (
          <button
            className="save-preset-btn"
            onClick={() => setIsSaving(true)}
          >
            + Save Current View
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
            <button onClick={handleSaveClick}>Save</button>
            <button onClick={() => setIsSaving(false)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  )
}

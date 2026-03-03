import { useState } from 'react'

interface CameraState {
  position: [number, number, number]
  target: [number, number, number]
  up: [number, number, number]
  fov: number
}

const STORAGE_KEY = 'axiom-camera-presets'

function loadPresetsFromStorage(): Record<string, CameraState> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (err) {
    console.error('Failed to load camera presets:', err)
  }
  return {}
}

export function useCameraPresets() {
  // Use lazy initialization to load from localStorage only once
  const [customPresets, setCustomPresets] = useState<Record<string, CameraState>>(loadPresetsFromStorage)

  const savePreset = (name: string, state: CameraState) => {
    const updated = { ...customPresets, [name]: state }
    setCustomPresets(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const deletePreset = (name: string) => {
    const updated = { ...customPresets }
    delete updated[name]
    setCustomPresets(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  return { customPresets, savePreset, deletePreset }
}

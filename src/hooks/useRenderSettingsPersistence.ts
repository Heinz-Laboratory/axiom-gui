import { useEffect } from 'react'
import { useAxiomStore } from '../store/axiomStore'

const STORAGE_KEY = 'axiom-render-settings'

/**
 * Hook to persist render settings to localStorage
 * Automatically saves on changes and restores on mount
 */
export function useRenderSettingsPersistence() {
  const { renderSettings, setRenderSettings } = useAxiomStore()

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Validate that parsed is an object and has expected properties
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          setRenderSettings(parsed)
        } else {
          console.warn('Invalid render settings in localStorage, clearing')
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch (error) {
      console.error('Failed to load render settings from localStorage:', error)
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [setRenderSettings])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(renderSettings))
    } catch (error) {
      console.error('Failed to save render settings to localStorage:', error)
    }
  }, [renderSettings])
}

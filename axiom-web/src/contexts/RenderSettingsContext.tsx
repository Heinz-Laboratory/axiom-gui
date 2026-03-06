// axiom-web/src/contexts/RenderSettingsContext.tsx
// Global state management for rendering settings with localStorage persistence

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { RenderSettings, RenderMode, QualitySettings, LightingSettings } from '../types/render-settings';
import { DEFAULT_RENDER_SETTINGS, hexToRgba, normalizeRenderSettings } from '../types/render-settings';

interface RenderSettingsContextType {
  settings: RenderSettings;
  updateRenderMode: (mode: RenderMode) => void;
  updateQuality: (quality: QualitySettings) => void;
  updateLighting: (lighting: LightingSettings) => void;
  updateBackgroundColor: (color: string) => void;
  resetToDefaults: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyToRenderer: (renderer: any) => void;
}

const RenderSettingsContext = createContext<RenderSettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'axiom-render-settings';

export function RenderSettingsProvider({ children }: { children: ReactNode }) {
  // Load settings from localStorage or use defaults
  const [settings, setSettings] = useState<RenderSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return normalizeRenderSettings(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load render settings from localStorage:', e);
    }
    return DEFAULT_RENDER_SETTINGS;
  });

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save render settings to localStorage:', e);
    }
  }, [settings]);

  const updateRenderMode = useCallback((mode: RenderMode) => {
    setSettings(prev => ({ ...prev, renderMode: mode }));
  }, []);

  const updateQuality = useCallback((quality: QualitySettings) => {
    setSettings(prev => ({ ...prev, quality }));
  }, []);

  const updateLighting = useCallback((lighting: LightingSettings) => {
    setSettings(prev => ({ ...prev, lighting }));
  }, []);

  const updateBackgroundColor = useCallback((color: string) => {
    setSettings(prev => ({ ...prev, backgroundColor: color }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_RENDER_SETTINGS);
  }, []);

  // Apply current settings to WASM renderer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyToRenderer = useCallback((renderer: any) => {
    if (!renderer) return;

    try {
      // Apply render mode
      const { renderMode } = settings;
      let modeParam = 1.0;
      let modeType = 'ball-and-stick';

      if (renderMode.type === 'ball-and-stick') {
        modeType = 'ball-and-stick';
        modeParam = renderMode.atomScale;
      } else if (renderMode.type === 'spacefill') {
        modeType = 'spacefill';
        modeParam = renderMode.vdwScale;
      } else if (renderMode.type === 'stick') {
        modeType = 'stick';
        modeParam = renderMode.atomRadius;
      } else if (renderMode.type === 'wireframe') {
        modeType = 'wireframe';
        modeParam = renderMode.lineWidth;
      }

      renderer.set_render_mode(modeType, modeParam);

      // Apply quality settings
      renderer.set_quality(settings.quality.ssaa, settings.quality.aoSamples);

      // Apply lighting (convert 0-100 to 0.0-1.0)
      renderer.set_lighting(
        settings.lighting.ambient / 100,
        settings.lighting.diffuse / 100,
        settings.lighting.specular / 100
      );

      // Apply background color
      const [r, g, b, a] = hexToRgba(settings.backgroundColor);
      renderer.set_background_color(r, g, b, a);
    } catch (e) {
      console.error('Failed to apply settings to renderer:', e);
    }
  }, [settings]);

  const value = {
    settings,
    updateRenderMode,
    updateQuality,
    updateLighting,
    updateBackgroundColor,
    resetToDefaults,
    applyToRenderer,
  };

  return (
    <RenderSettingsContext.Provider value={value}>
      {children}
    </RenderSettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRenderSettings() {
  const context = useContext(RenderSettingsContext);
  if (context === undefined) {
    throw new Error('useRenderSettings must be used within a RenderSettingsProvider');
  }
  return context;
}

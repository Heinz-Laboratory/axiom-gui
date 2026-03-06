// axiom-web/src/components/RenderSettingsPanel.tsx
// Comprehensive rendering settings UI with all controls

import { useState } from 'react';
import { useRenderSettings } from '../contexts/RenderSettingsContext';
import type { QualityPreset } from '../types/render-settings';
import { QUALITY_PRESETS, BACKGROUND_PRESETS } from '../types/render-settings';
import './RenderSettingsPanel.css';

export function RenderSettingsPanel() {
  const {
    settings,
    updateRenderMode,
    updateQuality,
    updateLighting,
    updateBackgroundColor,
    resetToDefaults,
  } = useRenderSettings();

  const [expandedSections, setExpandedSections] = useState({
    renderStyle: true,
    quality: true,
    lighting: true,
    background: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Render mode handlers
  const handleRenderModeChange = (mode: string) => {
    switch (mode) {
      case 'ball-and-stick':
        updateRenderMode({ type: 'ball-and-stick', atomScale: 1.0, bondRadius: 0.15 });
        break;
      case 'spacefill':
        updateRenderMode({ type: 'spacefill', vdwScale: 1.5 });
        break;
      case 'stick':
        updateRenderMode({ type: 'stick', atomRadius: 0.2, bondRadius: 0.15 });
        break;
      case 'wireframe':
        updateRenderMode({ type: 'wireframe', lineWidth: 0.1 });
        break;
    }
  };

  // Quality preset handlers
  const handleQualityPresetChange = (preset: QualityPreset) => {
    if (preset === 'custom') {
      updateQuality({ preset: 'custom', ssaa: settings.quality.ssaa, aoSamples: settings.quality.aoSamples });
    } else {
      const config = QUALITY_PRESETS[preset];
      updateQuality({ preset, ssaa: config.ssaa, aoSamples: config.aoSamples });
    }
  };

  const handleCustomQualityChange = (ssaa?: number, aoSamples?: number) => {
    updateQuality({
      preset: 'custom',
      ssaa: (ssaa as 1 | 2 | 4) ?? settings.quality.ssaa,
      aoSamples: aoSamples ?? settings.quality.aoSamples,
    });
  };

  // Lighting handlers
  const handleLightingChange = (component: 'ambient' | 'diffuse' | 'specular', value: number) => {
    updateLighting({
      ...settings.lighting,
      [component]: value,
    });
  };

  const resetLighting = () => {
    updateLighting({ ambient: 30, diffuse: 70, specular: 50 });
  };

  return (
    <div className="render-settings-panel">
      <h2>Rendering Settings</h2>

      {/* Render Style Section */}
      <section className="settings-section">
        <h3 onClick={() => toggleSection('renderStyle')} style={{ cursor: 'pointer' }}>
          {expandedSections.renderStyle ? '▼' : '▶'} Render Style
        </h3>
        {expandedSections.renderStyle && (
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="renderMode"
                value="ball-and-stick"
                checked={settings.renderMode.type === 'ball-and-stick'}
                onChange={(e) => handleRenderModeChange(e.target.value)}
              />
              Ball & Stick
            </label>
            <label>
              <input
                type="radio"
                name="renderMode"
                value="spacefill"
                checked={settings.renderMode.type === 'spacefill'}
                onChange={(e) => handleRenderModeChange(e.target.value)}
              />
              Spacefill
            </label>
            <label>
              <input
                type="radio"
                name="renderMode"
                value="stick"
                checked={settings.renderMode.type === 'stick'}
                onChange={(e) => handleRenderModeChange(e.target.value)}
              />
              Stick
            </label>
            <label>
              <input
                type="radio"
                name="renderMode"
                value="wireframe"
                checked={settings.renderMode.type === 'wireframe'}
                onChange={(e) => handleRenderModeChange(e.target.value)}
              />
              Wireframe
            </label>
          </div>
        )}
      </section>

      {/* Quality Section */}
      <section className="settings-section">
        <h3 onClick={() => toggleSection('quality')} style={{ cursor: 'pointer' }}>
          {expandedSections.quality ? '▼' : '▶'} Quality
        </h3>
        {expandedSections.quality && (
          <>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="quality"
                  value="draft"
                  checked={settings.quality.preset === 'draft'}
                  onChange={(e) => handleQualityPresetChange(e.target.value as QualityPreset)}
                />
                Draft (Fast)
              </label>
              <label>
                <input
                  type="radio"
                  name="quality"
                  value="good"
                  checked={settings.quality.preset === 'good'}
                  onChange={(e) => handleQualityPresetChange(e.target.value as QualityPreset)}
                />
                Good (Balanced)
              </label>
              <label>
                <input
                  type="radio"
                  name="quality"
                  value="best"
                  checked={settings.quality.preset === 'best'}
                  onChange={(e) => handleQualityPresetChange(e.target.value as QualityPreset)}
                />
                Best (High Quality)
              </label>
              <label>
                <input
                  type="radio"
                  name="quality"
                  value="custom"
                  checked={settings.quality.preset === 'custom'}
                  onChange={(e) => handleQualityPresetChange(e.target.value as QualityPreset)}
                />
                Custom
              </label>
            </div>
            {settings.quality.preset === 'custom' && (
              <div className="sliders">
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
          </>
        )}
      </section>

      {/* Lighting Section */}
      <section className="settings-section">
        <h3 onClick={() => toggleSection('lighting')} style={{ cursor: 'pointer' }}>
          {expandedSections.lighting ? '▼' : '▶'} Lighting
        </h3>
        {expandedSections.lighting && (
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
            <button onClick={resetLighting} className="reset-button">
              Reset Defaults
            </button>
          </div>
        )}
      </section>

      {/* Background Color Section */}
      <section className="settings-section">
        <h3 onClick={() => toggleSection('background')} style={{ cursor: 'pointer' }}>
          {expandedSections.background ? '▼' : '▶'} Background
        </h3>
        {expandedSections.background && (
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
        )}
      </section>

      {/* Reset All Button */}
      <button onClick={resetToDefaults} className="reset-all-button">
        Reset All to Defaults
      </button>
    </div>
  );
}

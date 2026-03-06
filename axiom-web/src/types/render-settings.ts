// axiom-web/src/types/render-settings.ts
// Type definitions for rendering settings

export interface RenderSettings {
  renderMode: RenderMode;
  quality: QualitySettings;
  lighting: LightingSettings;
  backgroundColor: string; // Hex color (#RRGGBB)
}

export type RenderMode =
  | { type: 'ball-and-stick'; atomScale: number; bondRadius: number }
  | { type: 'spacefill'; vdwScale: number }
  | { type: 'stick'; atomRadius: number; bondRadius: number }
  | { type: 'wireframe'; lineWidth: number };

export interface QualitySettings {
  preset: QualityPreset;
  ssaa: 1 | 2 | 4;
  aoSamples: number; // 0-32
}

export type QualityPreset = 'draft' | 'good' | 'best' | 'custom';

export interface LightingSettings {
  ambient: number;  // 0-100
  diffuse: number;  // 0-100
  specular: number; // 0-100
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// Default settings matching backend defaults
export const DEFAULT_RENDER_SETTINGS: RenderSettings = {
  renderMode: { type: 'ball-and-stick', atomScale: 1.0, bondRadius: 0.15 },
  quality: {
    preset: 'good',
    ssaa: 2,
    aoSamples: 8,
  },
  lighting: {
    ambient: 30,
    diffuse: 70,
    specular: 50,
  },
  backgroundColor: '#FFFFFF',
};

// Quality preset configurations
export const QUALITY_PRESETS: Record<Exclude<QualityPreset, 'custom'>, { ssaa: 1 | 2 | 4; aoSamples: number }> = {
  draft: { ssaa: 1, aoSamples: 4 },
  good: { ssaa: 2, aoSamples: 8 },
  best: { ssaa: 4, aoSamples: 16 },
};

// Background color presets
export const BACKGROUND_PRESETS = [
  { name: 'White', color: '#FFFFFF' },
  { name: 'Black', color: '#000000' },
  { name: 'Gray', color: '#808080' },
  { name: 'Light Blue', color: '#E6F2FF' },
  { name: 'Dark Blue', color: '#001122' },
];

// Helper functions
export function hexToRgba(hex: string): [number, number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return [1, 1, 1, 1]; // Default to white
  }
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
    1.0,
  ];
}

export function rgbaToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.round(Math.max(0, Math.min(255, n * 255)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function normalizeRenderMode(value: unknown): RenderMode {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return DEFAULT_RENDER_SETTINGS.renderMode
  }

  switch (value.type) {
    case 'ball-and-stick':
      if (typeof value.atomScale === 'number' && typeof value.bondRadius === 'number') {
        return {
          type: 'ball-and-stick',
          atomScale: value.atomScale,
          bondRadius: value.bondRadius,
        }
      }
      break
    case 'spacefill':
      if (typeof value.vdwScale === 'number') {
        return { type: 'spacefill', vdwScale: value.vdwScale }
      }
      break
    case 'stick':
      if (typeof value.atomRadius === 'number' && typeof value.bondRadius === 'number') {
        return {
          type: 'stick',
          atomRadius: value.atomRadius,
          bondRadius: value.bondRadius,
        }
      }
      break
    case 'wireframe':
      if (typeof value.lineWidth === 'number') {
        return { type: 'wireframe', lineWidth: value.lineWidth }
      }
      break
  }

  return DEFAULT_RENDER_SETTINGS.renderMode
}

function normalizeQualitySettings(value: unknown): QualitySettings {
  const defaults = DEFAULT_RENDER_SETTINGS.quality
  if (!isRecord(value)) {
    return defaults
  }

  const preset =
    value.preset === 'draft' || value.preset === 'good' || value.preset === 'best' || value.preset === 'custom'
      ? value.preset
      : defaults.preset
  const ssaa = value.ssaa === 1 || value.ssaa === 2 || value.ssaa === 4 ? value.ssaa : defaults.ssaa
  const aoSamples = typeof value.aoSamples === 'number' ? value.aoSamples : defaults.aoSamples

  return { preset, ssaa, aoSamples }
}

function normalizeLightingSettings(value: unknown): LightingSettings {
  const defaults = DEFAULT_RENDER_SETTINGS.lighting
  if (!isRecord(value)) {
    return defaults
  }

  return {
    ambient: typeof value.ambient === 'number' ? value.ambient : defaults.ambient,
    diffuse: typeof value.diffuse === 'number' ? value.diffuse : defaults.diffuse,
    specular: typeof value.specular === 'number' ? value.specular : defaults.specular,
  }
}

export function normalizeRenderSettings(value: unknown): RenderSettings {
  const defaults = DEFAULT_RENDER_SETTINGS
  if (!isRecord(value)) {
    return defaults
  }

  return {
    renderMode: normalizeRenderMode(value.renderMode),
    quality: normalizeQualitySettings(value.quality),
    lighting: normalizeLightingSettings(value.lighting),
    backgroundColor:
      typeof value.backgroundColor === 'string' ? value.backgroundColor : defaults.backgroundColor,
  }
}

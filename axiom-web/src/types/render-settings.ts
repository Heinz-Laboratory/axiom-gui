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

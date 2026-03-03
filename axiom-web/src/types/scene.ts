// Scene data types for session persistence

export interface CameraState {
  eye: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  fovy: number;
}

export interface RenderSettings {
  // Placeholder for future render settings
  // Will be populated in Phase 3.2
  backgroundColor?: string;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
}

export interface SceneData {
  version: string;
  timestamp: string;
  structureName: string;
  cameraState: CameraState;
  renderSettings: RenderSettings;
  selectedAtoms?: number[];
}

//! JSON scene export for saving/loading user work
//!
//! Captures complete scene state including camera, render settings,
//! selections, and measurements for session persistence.

use serde::{Deserialize, Serialize};

use crate::camera::Camera;

/// Complete scene state for saving/loading
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SceneExport {
    pub version: String,
    pub camera: CameraState,
    pub render_settings: RenderSettings,
    pub selection: Vec<usize>,
    pub measurements: Vec<Measurement>,
}

/// Camera state (position, orientation, FOV)
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CameraState {
    pub position: [f32; 3],
    pub target: [f32; 3],
    pub up: [f32; 3],
    pub fov: f32,
}

impl CameraState {
    /// Create from Camera instance
    pub fn from_camera(camera: &Camera) -> Self {
        Self {
            position: camera.eye.to_array(),
            target: camera.target.to_array(),
            up: camera.up.to_array(),
            fov: camera.fovy,
        }
    }

    /// Apply to Camera instance
    pub fn apply_to_camera(&self, camera: &mut Camera) {
        camera.eye = self.position.into();
        camera.target = self.target.into();
        camera.up = self.up.into();
        camera.fovy = self.fov;
    }
}

/// Render settings (lighting, background, style)
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RenderSettings {
    pub background_color: [f32; 4],
    pub ambient_light: f32,
    pub diffuse_light: f32,
    pub specular_light: f32,
    pub render_style: String, // "ball-stick", "spacefill", "wireframe", etc.
}

impl Default for RenderSettings {
    fn default() -> Self {
        Self {
            background_color: [0.0, 0.0, 0.0, 1.0], // Black
            ambient_light: 0.3,
            diffuse_light: 0.7,
            specular_light: 0.2,
            render_style: "ball-stick".to_string(),
        }
    }
}

/// Measurement (distance or angle between atoms)
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Measurement {
    pub measurement_type: String, // "distance" or "angle"
    pub atom_indices: Vec<usize>,
    pub value: f32,
    pub unit: String, // "Å" or "°"
}

/// Scene exporter
pub struct SceneExporter;

/// Scene export errors
#[derive(Debug)]
pub enum SceneError {
    SerializeFailed(String),
    DeserializeFailed(String),
}

impl std::fmt::Display for SceneError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SceneError::SerializeFailed(msg) => write!(f, "Scene serialization failed: {}", msg),
            SceneError::DeserializeFailed(msg) => write!(f, "Scene deserialization failed: {}", msg),
        }
    }
}

impl std::error::Error for SceneError {}

impl SceneExporter {
    /// Export scene to JSON string
    pub fn export_scene(
        camera: &Camera,
        settings: &RenderSettings,
        selection: &[usize],
        measurements: &[Measurement],
    ) -> Result<String, SceneError> {
        let scene = SceneExport {
            version: "1.0".to_string(),
            camera: CameraState::from_camera(camera),
            render_settings: settings.clone(),
            selection: selection.to_vec(),
            measurements: measurements.to_vec(),
        };

        serde_json::to_string_pretty(&scene)
            .map_err(|e| SceneError::SerializeFailed(e.to_string()))
    }

    /// Import scene from JSON string
    pub fn import_scene(json: &str) -> Result<SceneExport, SceneError> {
        serde_json::from_str(json)
            .map_err(|e| SceneError::DeserializeFailed(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use glam::Vec3;

    #[test]
    fn test_scene_export_roundtrip() {
        let camera = Camera {
            eye: Vec3::new(0.0, 0.0, 10.0),
            target: Vec3::ZERO,
            up: Vec3::Y,
            fovy: 45.0,
            aspect: 1.0,
            near: 0.1,
            far: 100.0,
        };

        let settings = RenderSettings::default();
        let selection = vec![0, 1, 2];
        let measurements = vec![Measurement {
            measurement_type: "distance".to_string(),
            atom_indices: vec![0, 1],
            value: 1.54,
            unit: "Å".to_string(),
        }];

        // Export
        let json = SceneExporter::export_scene(&camera, &settings, &selection, &measurements)
            .expect("Export should succeed");

        // Verify JSON is valid
        assert!(json.contains("\"version\""));
        assert!(json.contains("\"camera\""));
        assert!(json.contains("\"render_settings\""));

        // Import
        let imported = SceneExporter::import_scene(&json).expect("Import should succeed");

        // Verify data round-tripped correctly
        assert_eq!(imported.version, "1.0");
        assert_eq!(imported.camera.fov, 45.0);
        assert_eq!(imported.selection, vec![0, 1, 2]);
        assert_eq!(imported.measurements.len(), 1);
        assert_eq!(imported.measurements[0].value, 1.54);
    }

    #[test]
    fn test_camera_state_conversion() {
        let camera = Camera {
            eye: Vec3::new(1.0, 2.0, 3.0),
            target: Vec3::new(4.0, 5.0, 6.0),
            up: Vec3::Y,
            fovy: 60.0,
            aspect: 16.0 / 9.0,
            near: 0.1,
            far: 1000.0,
        };

        let state = CameraState::from_camera(&camera);
        assert_eq!(state.position, [1.0, 2.0, 3.0]);
        assert_eq!(state.target, [4.0, 5.0, 6.0]);
        assert_eq!(state.fov, 60.0);

        let mut camera2 = Camera::default();
        state.apply_to_camera(&mut camera2);
        assert_eq!(camera2.eye, camera.eye);
        assert_eq!(camera2.target, camera.target);
        assert_eq!(camera2.fovy, camera.fovy);
    }

    #[test]
    fn test_measurement_serialization() {
        let measurement = Measurement {
            measurement_type: "angle".to_string(),
            atom_indices: vec![0, 1, 2],
            value: 109.5,
            unit: "°".to_string(),
        };

        let json = serde_json::to_string(&measurement).expect("Serialization should succeed");
        assert!(json.contains("\"angle\""));
        assert!(json.contains("109.5"));

        let deserialized: Measurement = serde_json::from_str(&json).expect("Deserialization should succeed");
        assert_eq!(deserialized.measurement_type, "angle");
        assert_eq!(deserialized.value, 109.5);
    }
}

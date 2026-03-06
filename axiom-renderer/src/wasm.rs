// axiom-renderer/src/wasm.rs
// WASM bindings for JavaScript (only compiles for wasm32 target)

use std::collections::{BTreeMap, HashMap};

use crate::cif_parser::parse_cif;
use crate::molecule::{create_molecule, Molecule};
use crate::{AtomData, Camera, MoleculeGeometry, Renderer};
use serde::Serialize;
use wasm_bindgen::prelude::*;
use web_sys::HtmlCanvasElement;

#[derive(Serialize)]
struct CellParameters {
    a: f32,
    b: f32,
    c: f32,
    alpha: f32,
    beta: f32,
    gamma: f32,
}

#[derive(Serialize)]
struct CifMetadata {
    atom_count: usize,
    elements: BTreeMap<String, usize>,
    bond_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    cell_params: Option<CellParameters>,
    #[serde(skip_serializing_if = "Option::is_none")]
    space_group: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    bounds: Option<[f32; 6]>,
}

#[derive(Serialize)]
struct StructureInfo {
    atom_count: usize,
    elements: BTreeMap<String, usize>,
    bond_count: usize,
}

#[wasm_bindgen]
pub struct WasmRenderer {
    inner: Option<Renderer>,
    molecule: Option<Molecule>,
}

impl Default for WasmRenderer {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen]
impl WasmRenderer {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        // Set panic hook for better error messages
        console_error_panic_hook::set_once();
        Self {
            inner: None,
            molecule: None,
        }
    }

    #[wasm_bindgen]
    pub async fn initialize(&mut self, canvas: HtmlCanvasElement) -> Result<(), JsValue> {
        let renderer = Renderer::new(canvas)
            .await
            .map_err(|e| JsValue::from_str(&e))?;
        self.inner = Some(renderer);
        Ok(())
    }

    #[wasm_bindgen]
    pub fn render(&mut self, _atoms_js: JsValue) -> Result<(), JsValue> {
        let renderer = self
            .inner
            .as_mut()
            .ok_or_else(|| JsValue::from_str("Renderer not initialized"))?;

        // For now, accept an empty array since we don't have serde_wasm_bindgen
        // Full implementation will deserialize atoms from JavaScript
        let atoms: Vec<AtomData> = vec![];

        renderer.render(&atoms).map_err(|e| JsValue::from_str(&e))?;
        Ok(())
    }

    #[wasm_bindgen]
    pub fn resize(&mut self, width: u32, height: u32) {
        if let Some(ref mut renderer) = self.inner {
            renderer.resize(width, height);
        }
    }

    #[wasm_bindgen]
    pub fn rotate(&mut self, delta_x: f32, delta_y: f32) {
        if let Some(ref mut renderer) = self.inner {
            renderer.rotate_camera(delta_x, delta_y);
        }
    }

    #[wasm_bindgen]
    pub fn zoom(&mut self, delta: f32) {
        if let Some(ref mut renderer) = self.inner {
            renderer.zoom_camera(delta);
        }
    }

    /// Load a CIF file from text
    /// Returns a JSON string with structure metadata or error
    #[wasm_bindgen]
    pub fn load_cif(&mut self, cif_text: &str) -> Result<String, JsValue> {
        // Parse CIF
        let structure = parse_cif(cif_text)
            .map_err(|e| JsValue::from_str(&format!("CIF parse error: {}", e)))?;

        // Convert to molecule
        let molecule = create_molecule(&structure);

        let metadata = CifMetadata {
            atom_count: molecule.atoms.len(),
            elements: sorted_element_counts(&molecule),
            bond_count: molecule.bonds.len(),
            cell_params: Some(CellParameters {
                a: structure.cell_lengths[0],
                b: structure.cell_lengths[1],
                c: structure.cell_lengths[2],
                alpha: structure.cell_angles[0],
                beta: structure.cell_angles[1],
                gamma: structure.cell_angles[2],
            }),
            space_group: None,
            bounds: Some(molecule.bounds),
        };

        let metadata = serde_json::to_string(&metadata)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize CIF metadata: {}", e)))?;

        // Convert molecule to GPU geometry
        let geometry = MoleculeGeometry::from_molecule(&molecule);

        // Load molecule and geometry into renderer
        if let Some(ref mut renderer) = self.inner {
            renderer.load_molecule(molecule.clone(), geometry);
        }

        // Store molecule
        self.molecule = Some(molecule);

        Ok(metadata)
    }

    /// Get the current structure information as JSON
    #[wasm_bindgen]
    pub fn get_structure_info(&self) -> Result<String, JsValue> {
        if let Some(ref molecule) = self.molecule {
            let info = StructureInfo {
                atom_count: molecule.atoms.len(),
                elements: sorted_element_counts(molecule),
                bond_count: molecule.bonds.len(),
            };

            serde_json::to_string(&info).map_err(|e| {
                JsValue::from_str(&format!("Failed to serialize structure info: {}", e))
            })
        } else {
            Err(JsValue::from_str("No structure loaded"))
        }
    }

    /// Export the current structure as PDB format
    #[wasm_bindgen]
    pub fn export_pdb(&self, name: &str) -> Result<String, JsValue> {
        if let Some(ref molecule) = self.molecule {
            Ok(crate::export::export_pdb(molecule, name))
        } else {
            Err(JsValue::from_str("No structure loaded"))
        }
    }

    /// Export the current structure as XYZ format
    #[wasm_bindgen]
    pub fn export_xyz(&self, name: &str) -> Result<String, JsValue> {
        if let Some(ref molecule) = self.molecule {
            Ok(crate::export::export_xyz(molecule, name))
        } else {
            Err(JsValue::from_str("No structure loaded"))
        }
    }

    /// Export the current structure as CIF format
    #[wasm_bindgen]
    pub fn export_cif(&self, name: &str) -> Result<String, JsValue> {
        if let Some(ref molecule) = self.molecule {
            Ok(crate::export::export_cif(molecule, name))
        } else {
            Err(JsValue::from_str("No structure loaded"))
        }
    }

    /// Get camera state as JSON for scene export
    #[wasm_bindgen]
    pub fn get_camera_state(&self) -> Result<String, JsValue> {
        if let Some(ref renderer) = self.inner {
            let camera = &renderer.camera;
            // Export camera parameters as JSON
            let state = format!(
                r#"{{"eye":[{},{},{}],"target":[{},{},{}],"up":[{},{},{}],"fovy":{}}}"#,
                camera.eye.x,
                camera.eye.y,
                camera.eye.z,
                camera.target.x,
                camera.target.y,
                camera.target.z,
                camera.up.x,
                camera.up.y,
                camera.up.z,
                camera.fovy
            );
            Ok(state)
        } else {
            Err(JsValue::from_str("Renderer not initialized"))
        }
    }

    /// Set camera state from JSON for scene import
    #[wasm_bindgen]
    pub fn set_camera_state(&mut self, _state_json: &str) -> Result<(), JsValue> {
        if self.inner.is_some() {
            // For now, we'll use a simple parser
            // Production implementation would use serde_json
            // Expected format: {"eye":[x,y,z],"target":[x,y,z],"up":[x,y,z],"fovy":f}

            // This is a simplified implementation - just store the JSON
            // The actual parsing will be done on the JavaScript side
            // and passed back as separate parameters

            // For Phase 3.1, we'll accept the JSON but indicate that full
            // implementation requires serde_json integration
            Ok(())
        } else {
            Err(JsValue::from_str("Renderer not initialized"))
        }
    }

    /// Set camera position directly (for scene restoration)
    #[wasm_bindgen]
    pub fn set_camera_position(
        &mut self,
        eye_x: f32,
        eye_y: f32,
        eye_z: f32,
        target_x: f32,
        target_y: f32,
        target_z: f32,
    ) -> Result<(), JsValue> {
        if let Some(ref mut renderer) = self.inner {
            renderer.camera.eye = glam::Vec3::new(eye_x, eye_y, eye_z);
            renderer.camera.target = glam::Vec3::new(target_x, target_y, target_z);
            Ok(())
        } else {
            Err(JsValue::from_str("Renderer not initialized"))
        }
    }

    /// Export current view as PNG at specified resolution
    /// quality: "draft", "good", or "best"
    /// Returns PNG bytes as Uint8Array
    #[wasm_bindgen]
    pub fn export_png(&self, width: u32, height: u32, quality: &str) -> Result<Vec<u8>, JsValue> {
        // Note: PNG export requires the full renderer pipeline including PngExporter
        // For Phase 3.1, we'll return a placeholder implementation
        // Full implementation requires:
        // 1. Access to device/queue from renderer
        // 2. PngExporter instance
        // 3. RenderPipeline for offscreen rendering
        // 4. MoleculeGeometry from current state

        if self.inner.is_none() {
            return Err(JsValue::from_str("Renderer not initialized"));
        }

        if self.molecule.is_none() {
            return Err(JsValue::from_str("No molecule loaded"));
        }

        // Validate quality parameter
        let _quality_level = match quality {
            "draft" => crate::export::RenderQuality::Draft,
            "good" => crate::export::RenderQuality::Good,
            "best" => crate::export::RenderQuality::Best,
            _ => {
                return Err(JsValue::from_str(
                    "Invalid quality preset. Use 'draft', 'good', or 'best'",
                ))
            }
        };

        // Validate resolution
        if width < 640 || width > 15360 {
            return Err(JsValue::from_str("Width must be between 640 and 15360"));
        }
        if height < 480 || height > 8640 {
            return Err(JsValue::from_str("Height must be between 480 and 8640"));
        }

        // TODO: Implement actual PNG export using PngExporter
        // This requires refactoring Renderer to expose device/queue/pipeline
        // For now, return an error indicating this is not yet implemented
        Err(JsValue::from_str("PNG export not yet implemented. Requires renderer refactoring to expose GPU resources."))
    }

    /// Export complete scene as JSON
    /// Includes camera state, render settings, and metadata
    #[wasm_bindgen]
    pub fn export_scene(&self, name: &str) -> Result<String, JsValue> {
        if self.inner.is_none() {
            return Err(JsValue::from_str("Renderer not initialized"));
        }

        if self.molecule.is_none() {
            return Err(JsValue::from_str("No molecule loaded"));
        }

        let renderer = self.inner.as_ref().unwrap();

        // Use the SceneExporter
        let camera = &renderer.camera;
        let settings = crate::export::RenderSettings::default();
        let selection: Vec<usize> = vec![]; // No selection tracking yet
        let measurements: Vec<crate::export::Measurement> = vec![]; // No measurements yet

        let scene_json = crate::export::SceneExporter::export_scene(
            camera,
            &settings,
            &selection,
            &measurements,
        )
        .map_err(|e| JsValue::from_str(&format!("Scene export failed: {}", e)))?;

        // Wrap in a container with the structure name
        let container = format!(r#"{{"name": "{}", "scene": {}}}"#, name, scene_json);

        Ok(container)
    }

    /// Import scene from JSON
    /// Restores camera position and settings
    #[wasm_bindgen]
    pub fn import_scene(&mut self, scene_json: &str) -> Result<(), JsValue> {
        if self.inner.is_none() {
            return Err(JsValue::from_str("Renderer not initialized"));
        }

        // Parse the container format first
        // Expected: {"name": "...", "scene": {...}}
        // For simplicity, we'll extract the scene portion

        // This is a simplified implementation - a production version would use serde_json
        // For now, we'll just validate it's valid JSON and extract camera state

        let scene = crate::export::SceneExporter::import_scene(scene_json)
            .map_err(|e| JsValue::from_str(&format!("Scene import failed: {}", e)))?;

        // Apply camera state
        if let Some(ref mut renderer) = self.inner {
            scene.camera.apply_to_camera(&mut renderer.camera);
        }

        // TODO: Apply render settings when renderer supports them
        // TODO: Restore selections and measurements

        Ok(())
    }

    /// Set render mode (ball-and-stick, spacefill, stick, wireframe)
    /// mode: "ball-and-stick", "spacefill", "stick", "wireframe"
    /// param: atom_scale/vdw_scale/atom_radius/line_width depending on mode
    #[wasm_bindgen]
    pub fn set_render_mode(&mut self, mode: &str, param: f32) -> Result<(), JsValue> {
        if let Some(ref mut renderer) = self.inner {
            use crate::config::RenderMode;

            renderer.config.render_mode = match mode {
                "ball-and-stick" => RenderMode::BallAndStick {
                    atom_scale: param,
                    bond_radius: 0.15,
                },
                "spacefill" => RenderMode::Spacefill {
                    vdw_scale: param,
                },
                "stick" => RenderMode::Stick {
                    atom_radius: param,
                    bond_radius: 0.15,
                },
                "wireframe" => RenderMode::Wireframe {
                    line_width: param,
                },
                _ => return Err(JsValue::from_str(&format!("Invalid render mode: {}. Use 'ball-and-stick', 'spacefill', 'stick', or 'wireframe'", mode))),
            };

            Ok(())
        } else {
            Err(JsValue::from_str("Renderer not initialized"))
        }
    }

    /// Set quality settings (SSAA and AO samples)
    /// ssaa: 1, 2, or 4
    /// ao_samples: 0-32
    #[wasm_bindgen]
    pub fn set_quality(&mut self, ssaa: u32, ao_samples: u32) -> Result<(), JsValue> {
        if let Some(ref mut renderer) = self.inner {
            use crate::config::{QualityPreset, QualitySettings};

            // Validate SSAA
            QualitySettings::validate_ssaa(ssaa).map_err(|e| JsValue::from_str(&e))?;

            // Validate AO samples
            QualitySettings::validate_ao_samples(ao_samples).map_err(|e| JsValue::from_str(&e))?;

            renderer.config.quality = QualitySettings {
                preset: QualityPreset::Custom,
                ssaa,
                ao_samples,
            };

            Ok(())
        } else {
            Err(JsValue::from_str("Renderer not initialized"))
        }
    }

    /// Set quality preset (draft, good, best)
    #[wasm_bindgen]
    pub fn set_quality_preset(&mut self, preset: &str) -> Result<(), JsValue> {
        if let Some(ref mut renderer) = self.inner {
            use crate::config::QualitySettings;

            renderer.config.quality = match preset {
                "draft" => QualitySettings::draft(),
                "good" => QualitySettings::good(),
                "best" => QualitySettings::best(),
                _ => {
                    return Err(JsValue::from_str(&format!(
                        "Invalid quality preset: {}. Use 'draft', 'good', or 'best'",
                        preset
                    )))
                }
            };

            Ok(())
        } else {
            Err(JsValue::from_str("Renderer not initialized"))
        }
    }

    /// Set lighting parameters (Blinn-Phong)
    /// Values are 0.0 - 1.0 (will be clamped)
    #[wasm_bindgen]
    pub fn set_lighting(
        &mut self,
        ambient: f32,
        diffuse: f32,
        specular: f32,
    ) -> Result<(), JsValue> {
        if let Some(ref mut renderer) = self.inner {
            use crate::config::LightingSettings;

            renderer.config.lighting = LightingSettings::new(ambient, diffuse, specular);
            Ok(())
        } else {
            Err(JsValue::from_str("Renderer not initialized"))
        }
    }

    /// Set background color (RGBA, 0.0 - 1.0)
    #[wasm_bindgen]
    pub fn set_background_color(&mut self, r: f32, g: f32, b: f32, a: f32) -> Result<(), JsValue> {
        if let Some(ref mut renderer) = self.inner {
            renderer.config.background_color = [
                r.clamp(0.0, 1.0),
                g.clamp(0.0, 1.0),
                b.clamp(0.0, 1.0),
                a.clamp(0.0, 1.0),
            ];
            Ok(())
        } else {
            Err(JsValue::from_str("Renderer not initialized"))
        }
    }

    /// Get current render config as JSON
    #[wasm_bindgen]
    pub fn get_render_config(&self) -> Result<String, JsValue> {
        if let Some(ref renderer) = self.inner {
            // Manual JSON serialization (avoiding serde_json dependency for now)
            let config = &renderer.config;

            let mode_json = match &config.render_mode {
                crate::config::RenderMode::BallAndStick {
                    atom_scale,
                    bond_radius,
                } => {
                    format!(
                        r#"{{"type":"ball-and-stick","atomScale":{},"bondRadius":{}}}"#,
                        atom_scale, bond_radius
                    )
                }
                crate::config::RenderMode::Spacefill { vdw_scale } => {
                    format!(r#"{{"type":"spacefill","vdwScale":{}}}"#, vdw_scale)
                }
                crate::config::RenderMode::Stick {
                    atom_radius,
                    bond_radius,
                } => {
                    format!(
                        r#"{{"type":"stick","atomRadius":{},"bondRadius":{}}}"#,
                        atom_radius, bond_radius
                    )
                }
                crate::config::RenderMode::Wireframe { line_width } => {
                    format!(r#"{{"type":"wireframe","lineWidth":{}}}"#, line_width)
                }
            };

            let preset_str = match config.quality.preset {
                crate::config::QualityPreset::Draft => "draft",
                crate::config::QualityPreset::Good => "good",
                crate::config::QualityPreset::Best => "best",
                crate::config::QualityPreset::Custom => "custom",
            };

            let json = format!(
                r#"{{"renderMode":{},"quality":{{"preset":"{}","ssaa":{},"aoSamples":{}}},"lighting":{{"ambient":{},"diffuse":{},"specular":{}}},"backgroundColor":[{},{},{},{}]}}"#,
                mode_json,
                preset_str,
                config.quality.ssaa,
                config.quality.ao_samples,
                config.lighting.ambient,
                config.lighting.diffuse,
                config.lighting.specular,
                config.background_color[0],
                config.background_color[1],
                config.background_color[2],
                config.background_color[3]
            );

            Ok(json)
        } else {
            Err(JsValue::from_str("Renderer not initialized"))
        }
    }

    // ========== Selection API ==========

    /// Pick atom at screen coordinates (returns JSON or null)
    #[wasm_bindgen]
    pub fn pick_atom_at_screen(&self, x: f32, y: f32) -> JsValue {
        if let Some(ref renderer) = self.inner {
            match renderer.pick_atom_at_screen(x, y) {
                Some(result) => {
                    let json = format!(
                        r#"{{"atomIndex":{},"element":"{}","position":[{},{},{}]}}"#,
                        result.atom_index,
                        result.element,
                        result.position.x,
                        result.position.y,
                        result.position.z
                    );
                    JsValue::from_str(&json)
                }
                None => JsValue::NULL,
            }
        } else {
            JsValue::NULL
        }
    }

    /// Select an atom by index
    #[wasm_bindgen]
    pub fn select_atom(&mut self, index: usize) {
        if let Some(ref mut renderer) = self.inner {
            renderer.select_atom(index);
        }
    }

    /// Deselect an atom by index
    #[wasm_bindgen]
    pub fn deselect_atom(&mut self, index: usize) {
        if let Some(ref mut renderer) = self.inner {
            renderer.deselect_atom(index);
        }
    }

    /// Clear all selections
    #[wasm_bindgen]
    pub fn clear_selection(&mut self) {
        if let Some(ref mut renderer) = self.inner {
            renderer.clear_selection();
        }
    }

    /// Get selected atom indices as JSON array
    #[wasm_bindgen]
    pub fn get_selection(&self) -> JsValue {
        if let Some(ref renderer) = self.inner {
            let selection = renderer.get_selection();
            let json = format!(
                "[{}]",
                selection
                    .iter()
                    .map(|i| i.to_string())
                    .collect::<Vec<_>>()
                    .join(",")
            );
            JsValue::from_str(&json)
        } else {
            JsValue::from_str("[]")
        }
    }

    /// Get total atom count
    #[wasm_bindgen]
    pub fn get_atom_count(&self) -> usize {
        if let Some(ref renderer) = self.inner {
            renderer.get_atom_count()
        } else {
            0
        }
    }

    // ========== Measurement API ==========

    /// Create distance measurement (returns measurement ID or -1)
    #[wasm_bindgen]
    pub fn create_distance_measurement(&mut self, atom1: usize, atom2: usize) -> i32 {
        if let Some(ref mut renderer) = self.inner {
            renderer
                .create_distance_measurement(atom1, atom2)
                .map(|id| id as i32)
                .unwrap_or(-1)
        } else {
            -1
        }
    }

    /// Create angle measurement (returns measurement ID or -1)
    #[wasm_bindgen]
    pub fn create_angle_measurement(&mut self, atom1: usize, atom2: usize, atom3: usize) -> i32 {
        if let Some(ref mut renderer) = self.inner {
            renderer
                .create_angle_measurement(atom1, atom2, atom3)
                .map(|id| id as i32)
                .unwrap_or(-1)
        } else {
            -1
        }
    }

    /// Delete a measurement by ID
    #[wasm_bindgen]
    pub fn delete_measurement(&mut self, id: usize) {
        if let Some(ref mut renderer) = self.inner {
            renderer.delete_measurement(id);
        }
    }

    /// Get all measurements as JSON array
    #[wasm_bindgen]
    pub fn get_measurements(&self) -> JsValue {
        if let Some(ref renderer) = self.inner {
            let measurements = renderer.get_measurements();
            let mut items = Vec::new();

            for m in measurements {
                let type_str = match m.measurement_type {
                    crate::measurement::MeasurementType::Distance => "Distance",
                    crate::measurement::MeasurementType::Angle => "Angle",
                };

                let indices_str = m
                    .atom_indices
                    .iter()
                    .map(|i| i.to_string())
                    .collect::<Vec<_>>()
                    .join(",");

                let item = format!(
                    r#"{{"id":{},"measurement_type":"{}","atom_indices":[{}],"value":{},"label":"{}"}}"#,
                    m.id,
                    type_str,
                    indices_str,
                    m.value,
                    m.label.replace('"', "\\\"") // Escape quotes in label
                );
                items.push(item);
            }

            let json = format!("[{}]", items.join(","));
            JsValue::from_str(&json)
        } else {
            JsValue::from_str("[]")
        }
    }

    /// Clear all measurements
    #[wasm_bindgen]
    pub fn clear_measurements(&mut self) {
        if let Some(ref mut renderer) = self.inner {
            renderer.clear_measurements();
        }
    }

    /// Animate camera to a preset view (front, back, left, right, top, bottom)
    #[wasm_bindgen]
    pub fn animate_to_preset(&mut self, preset: &str, duration_ms: f32) -> Result<(), JsValue> {
        use crate::animation::EasingFunction;
        use crate::camera::CameraPreset;
        use glam::Vec3;

        let renderer = self
            .inner
            .as_mut()
            .ok_or_else(|| JsValue::from_str("Renderer not initialized"))?;

        let preset_enum = match preset {
            "front" => CameraPreset::Front,
            "back" => CameraPreset::Back,
            "left" => CameraPreset::Left,
            "right" => CameraPreset::Right,
            "top" => CameraPreset::Top,
            "bottom" => CameraPreset::Bottom,
            _ => return Err(JsValue::from_str("Invalid preset")),
        };

        // Get molecule bounding box
        let geometry = renderer
            .get_geometry()
            .ok_or_else(|| JsValue::from_str("No structure loaded"))?;

        let center_arr = geometry.center();
        let center = Vec3::from_array(center_arr);
        let size = geometry.diagonal();

        let (end_pos, end_tgt) = Camera::preset_position(preset_enum, center, size);
        let start_pos = renderer.camera.eye;
        let start_tgt = renderer.camera.target;

        renderer.animator.start(
            start_pos,
            end_pos,
            start_tgt,
            end_tgt,
            duration_ms,
            EasingFunction::EaseOut,
        );

        Ok(())
    }

    /// Animate camera to custom position
    #[wasm_bindgen]
    pub fn animate_camera_to(
        &mut self,
        pos_x: f32,
        pos_y: f32,
        pos_z: f32,
        tgt_x: f32,
        tgt_y: f32,
        tgt_z: f32,
        duration_ms: f32,
    ) -> Result<(), JsValue> {
        use crate::animation::EasingFunction;
        use glam::Vec3;

        let renderer = self
            .inner
            .as_mut()
            .ok_or_else(|| JsValue::from_str("Renderer not initialized"))?;

        let end_pos = Vec3::new(pos_x, pos_y, pos_z);
        let end_tgt = Vec3::new(tgt_x, tgt_y, tgt_z);
        let start_pos = renderer.camera.eye;
        let start_tgt = renderer.camera.target;

        renderer.animator.start(
            start_pos,
            end_pos,
            start_tgt,
            end_tgt,
            duration_ms,
            EasingFunction::EaseInOut,
        );

        Ok(())
    }
}

/// Count atoms by element
fn get_element_counts(molecule: &Molecule) -> HashMap<String, usize> {
    let mut counts = HashMap::new();
    for atom in &molecule.atoms {
        *counts.entry(atom.element.clone()).or_insert(0) += 1;
    }
    counts
}

/// Convert element counts to a sorted map for deterministic JSON output
fn sorted_element_counts(molecule: &Molecule) -> BTreeMap<String, usize> {
    get_element_counts(molecule).into_iter().collect()
}

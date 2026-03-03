// axiom-renderer/src/config.rs
// Rendering configuration for molecular visualization

use serde::{Deserialize, Serialize};

/// Complete rendering configuration for molecular visualization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderConfig {
    pub render_mode: RenderMode,
    pub quality: QualitySettings,
    pub lighting: LightingSettings,
    pub background_color: [f32; 4],
}

impl Default for RenderConfig {
    fn default() -> Self {
        Self {
            render_mode: RenderMode::default(),
            quality: QualitySettings::default(),
            lighting: LightingSettings::default(),
            background_color: [1.0, 1.0, 1.0, 1.0], // White
        }
    }
}

/// Render mode controlling atom/bond appearance
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RenderMode {
    /// Ball-and-stick: Atoms as spheres + bonds as cylinders
    BallAndStick {
        atom_scale: f32,
        bond_radius: f32,
    },
    /// Spacefill: Atoms at Van der Waals radii, no bonds
    Spacefill {
        vdw_scale: f32,
    },
    /// Stick: Thin bonds only, small atoms
    Stick {
        atom_radius: f32,
        bond_radius: f32,
    },
    /// Wireframe: Lines only, minimal atoms
    Wireframe {
        line_width: f32,
    },
}

impl Default for RenderMode {
    fn default() -> Self {
        Self::BallAndStick {
            atom_scale: 1.0,
            bond_radius: 0.15,
        }
    }
}

impl RenderMode {
    /// Get the atom radius multiplier for this render mode
    pub fn atom_scale(&self) -> f32 {
        match self {
            RenderMode::BallAndStick { atom_scale, .. } => *atom_scale,
            RenderMode::Spacefill { vdw_scale } => *vdw_scale,
            RenderMode::Stick { atom_radius, .. } => *atom_radius,
            RenderMode::Wireframe { .. } => 0.1,
        }
    }

    /// Get the bond radius for this render mode
    pub fn bond_radius(&self) -> f32 {
        match self {
            RenderMode::BallAndStick { bond_radius, .. } => *bond_radius,
            RenderMode::Spacefill { .. } => 0.0, // No bonds in spacefill
            RenderMode::Stick { bond_radius, .. } => *bond_radius,
            RenderMode::Wireframe { line_width } => *line_width * 0.5,
        }
    }

    /// Check if bonds should be rendered in this mode
    pub fn show_bonds(&self) -> bool {
        !matches!(self, RenderMode::Spacefill { .. })
    }
}

/// Quality settings for rendering
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct QualitySettings {
    /// Quality preset name
    pub preset: QualityPreset,
    /// Supersampling anti-aliasing multiplier (1x, 2x, 4x)
    pub ssaa: u32,
    /// Ambient occlusion sample count (0-32)
    pub ao_samples: u32,
}

impl Default for QualitySettings {
    fn default() -> Self {
        Self {
            preset: QualityPreset::Good,
            ssaa: 2,
            ao_samples: 8,
        }
    }
}

impl QualitySettings {
    /// Create draft quality preset (fast rendering)
    pub fn draft() -> Self {
        Self {
            preset: QualityPreset::Draft,
            ssaa: 1,
            ao_samples: 4,
        }
    }

    /// Create good quality preset (balanced)
    pub fn good() -> Self {
        Self {
            preset: QualityPreset::Good,
            ssaa: 2,
            ao_samples: 8,
        }
    }

    /// Create best quality preset (high quality)
    pub fn best() -> Self {
        Self {
            preset: QualityPreset::Best,
            ssaa: 4,
            ao_samples: 16,
        }
    }

    /// Create custom quality settings
    pub fn custom(ssaa: u32, ao_samples: u32) -> Self {
        Self {
            preset: QualityPreset::Custom,
            ssaa: ssaa.clamp(1, 4),
            ao_samples: ao_samples.clamp(0, 32),
        }
    }

    /// Validate SSAA value (must be 1, 2, or 4)
    pub fn validate_ssaa(ssaa: u32) -> Result<u32, String> {
        match ssaa {
            1 | 2 | 4 => Ok(ssaa),
            _ => Err(format!("Invalid SSAA value: {}. Must be 1, 2, or 4", ssaa)),
        }
    }

    /// Validate AO samples (0-32 range)
    pub fn validate_ao_samples(samples: u32) -> Result<u32, String> {
        if samples <= 32 {
            Ok(samples)
        } else {
            Err(format!("Invalid AO samples: {}. Must be 0-32", samples))
        }
    }
}

/// Quality preset options
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum QualityPreset {
    /// Fast rendering (1x SSAA, 4 AO samples)
    Draft,
    /// Balanced quality (2x SSAA, 8 AO samples)
    Good,
    /// High quality (4x SSAA, 16 AO samples)
    Best,
    /// Custom settings
    Custom,
}

/// Lighting parameters for Blinn-Phong shading
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct LightingSettings {
    /// Ambient light intensity (0.0 - 1.0)
    pub ambient: f32,
    /// Diffuse light intensity (0.0 - 1.0)
    pub diffuse: f32,
    /// Specular highlight intensity (0.0 - 1.0)
    pub specular: f32,
}

impl Default for LightingSettings {
    fn default() -> Self {
        Self {
            ambient: 0.3,
            diffuse: 0.7,
            specular: 0.5,
        }
    }
}

impl LightingSettings {
    /// Create new lighting settings with validation
    pub fn new(ambient: f32, diffuse: f32, specular: f32) -> Self {
        Self {
            ambient: ambient.clamp(0.0, 1.0),
            diffuse: diffuse.clamp(0.0, 1.0),
            specular: specular.clamp(0.0, 1.0),
        }
    }

    /// Convert to GPU uniform data (16-byte aligned)
    pub fn to_uniform_data(&self) -> [f32; 4] {
        [self.ambient, self.diffuse, self.specular, 0.0] // padding for alignment
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = RenderConfig::default();
        assert!(matches!(config.render_mode, RenderMode::BallAndStick { .. }));
        assert_eq!(config.quality.ssaa, 2);
        assert_eq!(config.quality.ao_samples, 8);
        assert_eq!(config.lighting.ambient, 0.3);
        assert_eq!(config.background_color, [1.0, 1.0, 1.0, 1.0]);
    }

    #[test]
    fn test_render_mode_scales() {
        let ball_stick = RenderMode::BallAndStick {
            atom_scale: 1.0,
            bond_radius: 0.15,
        };
        assert_eq!(ball_stick.atom_scale(), 1.0);
        assert_eq!(ball_stick.bond_radius(), 0.15);
        assert!(ball_stick.show_bonds());

        let spacefill = RenderMode::Spacefill { vdw_scale: 1.5 };
        assert_eq!(spacefill.atom_scale(), 1.5);
        assert_eq!(spacefill.bond_radius(), 0.0);
        assert!(!spacefill.show_bonds());
    }

    #[test]
    fn test_quality_presets() {
        let draft = QualitySettings::draft();
        assert_eq!(draft.ssaa, 1);
        assert_eq!(draft.ao_samples, 4);

        let good = QualitySettings::good();
        assert_eq!(good.ssaa, 2);
        assert_eq!(good.ao_samples, 8);

        let best = QualitySettings::best();
        assert_eq!(best.ssaa, 4);
        assert_eq!(best.ao_samples, 16);

        let custom = QualitySettings::custom(3, 12);
        assert_eq!(custom.ssaa, 3); // Note: will be validated to 2 or 4 in WASM API
        assert_eq!(custom.ao_samples, 12);
    }

    #[test]
    fn test_ssaa_validation() {
        assert!(QualitySettings::validate_ssaa(1).is_ok());
        assert!(QualitySettings::validate_ssaa(2).is_ok());
        assert!(QualitySettings::validate_ssaa(4).is_ok());
        assert!(QualitySettings::validate_ssaa(3).is_err());
        assert!(QualitySettings::validate_ssaa(8).is_err());
    }

    #[test]
    fn test_ao_samples_validation() {
        assert!(QualitySettings::validate_ao_samples(0).is_ok());
        assert!(QualitySettings::validate_ao_samples(16).is_ok());
        assert!(QualitySettings::validate_ao_samples(32).is_ok());
        assert!(QualitySettings::validate_ao_samples(33).is_err());
    }

    #[test]
    fn test_lighting_clamping() {
        let lighting = LightingSettings::new(1.5, -0.2, 0.8);
        assert_eq!(lighting.ambient, 1.0); // clamped
        assert_eq!(lighting.diffuse, 0.0); // clamped
        assert_eq!(lighting.specular, 0.8);
    }

    #[test]
    fn test_lighting_uniform_data() {
        let lighting = LightingSettings::new(0.3, 0.7, 0.5);
        let data = lighting.to_uniform_data();
        assert_eq!(data, [0.3, 0.7, 0.5, 0.0]);
    }
}

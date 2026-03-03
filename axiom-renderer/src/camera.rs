// axiom-renderer/src/camera.rs
// Camera matrices and transformations

use glam::{Mat4, Vec3};

pub struct Camera {
    pub eye: Vec3,
    pub target: Vec3,
    pub up: Vec3,
    pub fovy: f32,       // Field of view (radians)
    pub aspect: f32,     // Aspect ratio (width/height)
    pub near: f32,
    pub far: f32,
}

impl Camera {
    pub fn new(width: u32, height: u32) -> Self {
        Self {
            eye: Vec3::new(0.0, 0.0, 10.0),
            target: Vec3::ZERO,
            up: Vec3::Y,
            fovy: 45.0_f32.to_radians(),
            aspect: width as f32 / height as f32,
            near: 0.1,
            far: 100.0,
        }
    }

    pub fn view_matrix(&self) -> Mat4 {
        Mat4::look_at_rh(self.eye, self.target, self.up)
    }

    pub fn projection_matrix(&self) -> Mat4 {
        Mat4::perspective_rh(self.fovy, self.aspect, self.near, self.far)
    }

    pub fn view_projection_matrix(&self) -> Mat4 {
        self.projection_matrix() * self.view_matrix()
    }

    pub fn rotate(&mut self, delta_x: f32, delta_y: f32) {
        // Rotate camera around target (trackball-style)
        // Convert to spherical coordinates, rotate, convert back
        let offset = self.eye - self.target;
        let radius = offset.length();

        // Convert to spherical coordinates
        let mut theta = offset.z.atan2(offset.x);  // Azimuthal angle
        let mut phi = (offset.y / radius).acos();   // Polar angle

        // Apply rotations
        theta -= delta_x * 0.01;
        phi -= delta_y * 0.01;

        // Clamp phi to avoid gimbal lock
        phi = phi.clamp(0.01, std::f32::consts::PI - 0.01);

        // Convert back to Cartesian
        self.eye = self.target + Vec3::new(
            radius * phi.sin() * theta.cos(),
            radius * phi.cos(),
            radius * phi.sin() * theta.sin(),
        );
    }

    pub fn zoom(&mut self, delta: f32) {
        let direction = (self.eye - self.target).normalize();
        let new_eye = self.eye + direction * delta;

        // Don't zoom too close to target
        let distance = (new_eye - self.target).length();
        if distance > 0.5 {
            self.eye = new_eye;
        }
    }

    pub fn set_aspect(&mut self, aspect: f32) {
        self.aspect = aspect;
    }

    /// Position camera to look at a point from a given distance
    pub fn look_at(&mut self, target_pos: [f32; 3], distance: f32) {
        self.target = Vec3::from_array(target_pos);
        // Position camera on the positive Z axis looking at target
        self.eye = self.target + Vec3::new(0.0, 0.0, distance);
    }

    /// Get camera state for serialization/export
    pub fn get_state(&self) -> CameraState {
        CameraState {
            position: self.eye.to_array(),
            target: self.target.to_array(),
            up: self.up.to_array(),
            fov: self.fovy,
        }
    }

    /// Get preset camera position relative to bounding box
    /// Returns (position, target) for the given preset view
    pub fn preset_position(preset: CameraPreset, center: Vec3, size: f32) -> (Vec3, Vec3) {
        let distance = size * 1.5; // Same as fit_to_view

        let (offset, up) = match preset {
            CameraPreset::Front => (Vec3::new(0.0, 0.0, distance), Vec3::Y),
            CameraPreset::Back => (Vec3::new(0.0, 0.0, -distance), Vec3::Y),
            CameraPreset::Left => (Vec3::new(-distance, 0.0, 0.0), Vec3::Y),
            CameraPreset::Right => (Vec3::new(distance, 0.0, 0.0), Vec3::Y),
            CameraPreset::Top => (Vec3::new(0.0, distance, 0.0), -Vec3::Z),
            CameraPreset::Bottom => (Vec3::new(0.0, -distance, 0.0), Vec3::Z),
        };

        // Update up vector for top/bottom views
        let _up_vec = up; // Store for future use if needed

        (center + offset, center)
    }
}

/// Camera preset view angles
#[derive(Clone, Copy, Debug)]
pub enum CameraPreset {
    Front,
    Back,
    Left,
    Right,
    Top,
    Bottom,
}

/// Camera state for serialization
#[derive(Clone, Debug)]
pub struct CameraState {
    pub position: [f32; 3],
    pub target: [f32; 3],
    pub up: [f32; 3],
    pub fov: f32,
}

impl Default for Camera {
    fn default() -> Self {
        Self::new(800, 600)
    }
}

// axiom-renderer/src/animation.rs
// Camera animation system with easing functions

use glam::Vec3;

/// Easing function type for camera animations
#[derive(Clone, Copy, Debug)]
pub enum EasingFunction {
    Linear,
    EaseOut,    // Quintic ease-out (fast start, slow end)
    EaseInOut,  // Quintic ease-in-out (slow-fast-slow)
}

/// Camera animation state manager
#[derive(Debug)]
pub struct CameraAnimator {
    start_position: Vec3,
    end_position: Vec3,
    start_target: Vec3,
    end_target: Vec3,
    duration_ms: f32,
    elapsed_ms: f32,
    pub is_animating: bool,
    easing_fn: EasingFunction,
}

impl Default for CameraAnimator {
    fn default() -> Self {
        Self::new()
    }
}

impl CameraAnimator {
    /// Create a new camera animator in stopped state
    pub fn new() -> Self {
        Self {
            start_position: Vec3::ZERO,
            end_position: Vec3::ZERO,
            start_target: Vec3::ZERO,
            end_target: Vec3::ZERO,
            duration_ms: 0.0,
            elapsed_ms: 0.0,
            is_animating: false,
            easing_fn: EasingFunction::Linear,
        }
    }

    /// Start a new animation from current position to target position
    pub fn start(
        &mut self,
        start_pos: Vec3,
        end_pos: Vec3,
        start_tgt: Vec3,
        end_tgt: Vec3,
        duration_ms: f32,
        easing: EasingFunction,
    ) {
        self.start_position = start_pos;
        self.end_position = end_pos;
        self.start_target = start_tgt;
        self.end_target = end_tgt;
        self.duration_ms = duration_ms;
        self.elapsed_ms = 0.0;
        self.is_animating = true;
        self.easing_fn = easing;
    }

    /// Update animation by delta time in milliseconds
    /// Returns (current_position, current_target, is_complete)
    pub fn update(&mut self, delta_ms: f32) -> (Vec3, Vec3, bool) {
        if !self.is_animating {
            return (self.start_position, self.start_target, true);
        }

        self.elapsed_ms += delta_ms;

        if self.elapsed_ms >= self.duration_ms {
            // Animation complete - clamp to end
            self.is_animating = false;
            return (self.end_position, self.end_target, true);
        }

        let (pos, tgt) = self.interpolate();
        (pos, tgt, false)
    }

    /// Interpolate position and target with easing
    fn interpolate(&self) -> (Vec3, Vec3) {
        let t = (self.elapsed_ms / self.duration_ms).clamp(0.0, 1.0);
        let eased_t = self.ease(t);

        let pos = self.start_position.lerp(self.end_position, eased_t);
        let tgt = self.start_target.lerp(self.end_target, eased_t);

        (pos, tgt)
    }

    /// Apply easing function to t (0.0-1.0)
    fn ease(&self, t: f32) -> f32 {
        match self.easing_fn {
            EasingFunction::Linear => t,
            EasingFunction::EaseOut => ease_out_quint(t),
            EasingFunction::EaseInOut => ease_in_out_quint(t),
        }
    }
}

/// Quintic ease-out function (fast start, slow end)
fn ease_out_quint(t: f32) -> f32 {
    1.0 - (1.0 - t).powi(5)
}

/// Quintic ease-in-out function (slow-fast-slow)
fn ease_in_out_quint(t: f32) -> f32 {
    if t < 0.5 {
        16.0 * t.powi(5)
    } else {
        1.0 - (-2.0 * t + 2.0).powi(5) / 2.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_linear_interpolation() {
        let mut anim = CameraAnimator::new();
        anim.start(
            Vec3::ZERO,
            Vec3::new(10.0, 0.0, 0.0),
            Vec3::ZERO,
            Vec3::ZERO,
            100.0,
            EasingFunction::Linear,
        );

        let (pos, _, _) = anim.update(50.0); // 50% through
        assert!((pos.x - 5.0).abs() < 0.01, "Linear interpolation at 50% should be halfway");
    }

    #[test]
    fn test_ease_out_characteristics() {
        // Test that ease-out starts fast (derivative at t=0 should be > 1)
        let t1 = ease_out_quint(0.1);
        assert!(t1 > 0.1, "Ease-out should move faster than linear at start");

        // Test that ease-out ends slow (should be close to 1.0 at t=0.9)
        let t2 = ease_out_quint(0.9);
        assert!(t2 > 0.9, "Ease-out should approach 1.0 slowly");
    }

    #[test]
    fn test_animation_completion() {
        let mut anim = CameraAnimator::new();
        anim.start(
            Vec3::ZERO,
            Vec3::new(10.0, 0.0, 0.0),
            Vec3::ZERO,
            Vec3::ZERO,
            100.0,
            EasingFunction::Linear,
        );

        let (_, _, done1) = anim.update(50.0);
        assert!(!done1, "Animation should not be done at 50%");

        let (pos, _, done2) = anim.update(100.0); // Overshoot
        assert!(done2, "Animation should be complete after overshooting duration");
        assert!((pos.x - 10.0).abs() < 0.01, "Position should be clamped to end");
    }

    #[test]
    fn test_target_interpolation() {
        // Test that target (look-at point) also animates smoothly
        let mut anim = CameraAnimator::new();
        anim.start(
            Vec3::ZERO,
            Vec3::ZERO,
            Vec3::new(0.0, 0.0, 0.0),
            Vec3::new(5.0, 5.0, 5.0),
            100.0,
            EasingFunction::Linear,
        );

        let (_, tgt, _) = anim.update(50.0);
        assert!((tgt.x - 2.5).abs() < 0.01, "Target X should be halfway");
        assert!((tgt.y - 2.5).abs() < 0.01, "Target Y should be halfway");
        assert!((tgt.z - 2.5).abs() < 0.01, "Target Z should be halfway");
    }

    #[test]
    fn test_no_animation_when_stopped() {
        let mut anim = CameraAnimator::new();
        let (pos1, tgt1, _) = anim.update(50.0); // Not started
        let (pos2, tgt2, _) = anim.update(50.0);

        assert_eq!(pos1, pos2, "Position should not change when not animating");
        assert_eq!(tgt1, tgt2, "Target should not change when not animating");
    }

    #[test]
    fn test_ease_in_out_symmetry() {
        // Test symmetry: ease_in_out(0.25) + ease_in_out(0.75) should ≈ 1.0
        let t1 = ease_in_out_quint(0.25);
        let t2 = ease_in_out_quint(0.75);
        assert!((t1 + t2 - 1.0).abs() < 0.1, "Ease-in-out should be roughly symmetric");
    }

    #[test]
    fn test_easing_bounds() {
        // Test that all easing functions map [0,1] → [0,1]
        for t in [0.0, 0.25, 0.5, 0.75, 1.0] {
            let linear = t;
            let ease_out = ease_out_quint(t);
            let ease_in_out = ease_in_out_quint(t);

            assert!(linear >= 0.0 && linear <= 1.0, "Linear should stay in bounds");
            assert!(ease_out >= 0.0 && ease_out <= 1.0, "EaseOut should stay in bounds");
            assert!(ease_in_out >= 0.0 && ease_in_out <= 1.0, "EaseInOut should stay in bounds");
        }
    }
}

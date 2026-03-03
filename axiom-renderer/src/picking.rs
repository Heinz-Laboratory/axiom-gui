// Atom picking via ray casting for click selection
//
// This module implements precise 3D atom selection by unprojecting
// 2D screen coordinates to 3D rays and testing intersection with
// atom spheres. Uses analytical ray-sphere intersection for accuracy.

use glam::{Mat4, Vec3};

/// A ray in 3D space, defined by origin point and direction vector
#[derive(Debug, Clone)]
pub struct Ray {
    /// Starting point of the ray
    pub origin: Vec3,
    /// Normalized direction vector
    pub direction: Vec3,
}

impl Ray {
    /// Create a ray from screen coordinates
    ///
    /// Unprojects 2D screen coordinates to a 3D ray in world space
    /// using the inverse view-projection matrix.
    ///
    /// # Arguments
    /// * `screen_x` - X coordinate in screen space (0 = left edge)
    /// * `screen_y` - Y coordinate in screen space (0 = top edge)
    /// * `width` - Canvas width in pixels
    /// * `height` - Canvas height in pixels
    /// * `view_proj_matrix` - Combined view * projection matrix
    ///
    /// # Returns
    /// Ray in world space with normalized direction
    pub fn from_screen(
        screen_x: f32,
        screen_y: f32,
        width: u32,
        height: u32,
        view_proj_matrix: Mat4,
    ) -> Self {
        // Convert screen coords to NDC (-1 to 1)
        let ndc_x = (2.0 * screen_x) / width as f32 - 1.0;
        let ndc_y = 1.0 - (2.0 * screen_y) / height as f32; // Flip Y (screen space is top-down)

        // Unproject to world space using inverse view-projection
        let inv_vp = view_proj_matrix.inverse();
        let near_point = inv_vp.transform_point3(Vec3::new(ndc_x, ndc_y, -1.0));
        let far_point = inv_vp.transform_point3(Vec3::new(ndc_x, ndc_y, 1.0));

        let direction = (far_point - near_point).normalize();

        Self {
            origin: near_point,
            direction,
        }
    }

    /// Test intersection with a sphere
    ///
    /// Returns the distance along the ray to the nearest intersection point,
    /// or None if the ray misses the sphere.
    ///
    /// # Arguments
    /// * `center` - Sphere center position
    /// * `radius` - Sphere radius
    ///
    /// # Returns
    /// Distance along ray to intersection (positive = in front of origin), or None
    pub fn intersect_sphere(&self, center: Vec3, radius: f32) -> Option<f32> {
        // Analytic ray-sphere intersection using quadratic formula
        // Ray: P(t) = origin + t * direction
        // Sphere: ||P - center||^2 = radius^2
        //
        // Substituting: ||origin + t*direction - center||^2 = radius^2
        // Let oc = origin - center
        // Then: ||oc + t*direction||^2 = radius^2
        // Expanding: oc·oc + 2*t*(oc·direction) + t^2*(direction·direction) = radius^2
        // Rearranging: a*t^2 + b*t + c = 0
        // where: a = direction·direction, b = 2*(oc·direction), c = oc·oc - radius^2

        let oc = self.origin - center;
        let a = self.direction.dot(self.direction);
        let b = 2.0 * oc.dot(self.direction);
        let c = oc.dot(oc) - radius * radius;
        let discriminant = b * b - 4.0 * a * c;

        if discriminant < 0.0 {
            // No intersection
            None
        } else {
            // Two intersection points (or one tangent point if discriminant == 0)
            // We want the nearest one in front of the ray origin
            let t = (-b - discriminant.sqrt()) / (2.0 * a);
            if t > 0.0 {
                Some(t)
            } else {
                // Ray origin is inside sphere, use far intersection
                let t_far = (-b + discriminant.sqrt()) / (2.0 * a);
                if t_far > 0.0 {
                    Some(t_far)
                } else {
                    None
                }
            }
        }
    }
}

/// Result of an atom picking operation
#[derive(Debug, Clone)]
pub struct PickResult {
    /// Index of the picked atom
    pub atom_index: usize,
    /// 3D position of the atom center
    pub position: Vec3,
    /// Element symbol (e.g., "C", "O", "Fe")
    pub element: String,
    /// Distance along ray to intersection point
    pub distance: f32,
}

/// Pick the closest atom at screen coordinates
///
/// Tests ray-sphere intersection for all atoms and returns the closest hit.
///
/// # Arguments
/// * `screen_x` - X coordinate in screen space
/// * `screen_y` - Y coordinate in screen space
/// * `width` - Canvas width in pixels
/// * `height` - Canvas height in pixels
/// * `view_proj_matrix` - Combined view * projection matrix
/// * `atoms` - Slice of (position, radius, element) tuples for all atoms
///
/// # Returns
/// Information about the closest picked atom, or None if no atom was hit
pub fn pick_atom(
    screen_x: f32,
    screen_y: f32,
    width: u32,
    height: u32,
    view_proj_matrix: Mat4,
    atoms: &[(Vec3, f32, String)], // (position, radius, element)
) -> Option<PickResult> {
    let ray = Ray::from_screen(screen_x, screen_y, width, height, view_proj_matrix);

    let mut closest: Option<PickResult> = None;

    for (i, (pos, radius, element)) in atoms.iter().enumerate() {
        if let Some(dist) = ray.intersect_sphere(*pos, *radius) {
            if closest.is_none() || dist < closest.as_ref().unwrap().distance {
                closest = Some(PickResult {
                    atom_index: i,
                    position: *pos,
                    element: element.clone(),
                    distance: dist,
                });
            }
        }
    }

    closest
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ray_sphere_intersection_hit() {
        let ray = Ray {
            origin: Vec3::new(0.0, 0.0, 0.0),
            direction: Vec3::new(0.0, 0.0, 1.0),
        };
        let center = Vec3::new(0.0, 0.0, 5.0);
        let radius = 1.0;

        let result = ray.intersect_sphere(center, radius);
        assert!(result.is_some());
        assert!((result.unwrap() - 4.0).abs() < 0.01); // Hit at t=4 (5 - 1 = 4)
    }

    #[test]
    fn test_ray_sphere_intersection_miss() {
        let ray = Ray {
            origin: Vec3::new(0.0, 0.0, 0.0),
            direction: Vec3::new(0.0, 0.0, 1.0),
        };
        let center = Vec3::new(10.0, 0.0, 5.0); // Far to the side
        let radius = 1.0;

        let result = ray.intersect_sphere(center, radius);
        assert!(result.is_none());
    }

    #[test]
    fn test_ray_sphere_intersection_behind() {
        let ray = Ray {
            origin: Vec3::new(0.0, 0.0, 0.0),
            direction: Vec3::new(0.0, 0.0, 1.0),
        };
        let center = Vec3::new(0.0, 0.0, -5.0); // Behind ray origin
        let radius = 1.0;

        let result = ray.intersect_sphere(center, radius);
        assert!(result.is_none());
    }

    #[test]
    fn test_pick_atom_closest() {
        let view_proj = Mat4::IDENTITY; // Simplified test
        let atoms = vec![
            (Vec3::new(0.0, 0.0, 5.0), 1.0, "C".to_string()),
            (Vec3::new(0.0, 0.0, 3.0), 1.0, "O".to_string()), // Closer
        ];

        // Screen center maps to (0, 0) in NDC with identity matrix
        // For IDENTITY matrix, this creates a ray along +Z
        let result = pick_atom(400.0, 300.0, 800, 600, view_proj, &atoms);

        assert!(result.is_some());
        let pick = result.unwrap();
        assert_eq!(pick.atom_index, 1); // Second atom is closer
        assert_eq!(pick.element, "O");
    }
}

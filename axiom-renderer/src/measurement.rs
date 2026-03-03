// Molecular measurement calculations (distances, angles, dihedrals)
//
// Provides tools for measuring geometric properties of molecular structures:
// - Distance between two atoms
// - Angle between three atoms
// - Management of measurement collections

use glam::Vec3;
use serde::{Serialize, Deserialize};

/// Type of measurement
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MeasurementType {
    /// Distance between two atoms (in Ångströms)
    Distance,
    /// Angle between three atoms (in degrees, vertex at second atom)
    Angle,
}

/// A single measurement with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Measurement {
    /// Unique identifier for this measurement
    pub id: usize,
    /// Type of measurement (distance or angle)
    pub measurement_type: MeasurementType,
    /// Indices of atoms involved in the measurement
    pub atom_indices: Vec<usize>,
    /// Calculated value (distance in Å or angle in degrees)
    pub value: f32,
    /// Human-readable label (e.g., "C12 - O34: 1.42 Å")
    pub label: String,
}

impl Measurement {
    /// Create a new distance measurement between two atoms
    ///
    /// # Arguments
    /// * `id` - Unique measurement ID
    /// * `atom1` - Index of first atom
    /// * `atom2` - Index of second atom
    /// * `pos1` - Position of first atom
    /// * `pos2` - Position of second atom
    /// * `elem1` - Element symbol of first atom
    /// * `elem2` - Element symbol of second atom
    ///
    /// # Returns
    /// Measurement with calculated distance in Ångströms
    pub fn new_distance(
        id: usize,
        atom1: usize,
        atom2: usize,
        pos1: Vec3,
        pos2: Vec3,
        elem1: &str,
        elem2: &str,
    ) -> Self {
        let distance = (pos2 - pos1).length();
        Self {
            id,
            measurement_type: MeasurementType::Distance,
            atom_indices: vec![atom1, atom2],
            value: distance,
            label: format!("{}{} - {}{}: {:.2} Å", elem1, atom1, elem2, atom2, distance),
        }
    }

    /// Create a new angle measurement between three atoms
    ///
    /// The angle is calculated at the second atom (vertex).
    ///
    /// # Arguments
    /// * `id` - Unique measurement ID
    /// * `atom1` - Index of first atom
    /// * `atom2` - Index of second atom (vertex)
    /// * `atom3` - Index of third atom
    /// * `pos1` - Position of first atom
    /// * `pos2` - Position of second atom (vertex)
    /// * `pos3` - Position of third atom
    /// * `elem1` - Element symbol of first atom
    /// * `elem2` - Element symbol of second atom (vertex)
    /// * `elem3` - Element symbol of third atom
    ///
    /// # Returns
    /// Measurement with calculated angle in degrees
    pub fn new_angle(
        id: usize,
        atom1: usize,
        atom2: usize,
        atom3: usize,
        pos1: Vec3,
        pos2: Vec3,
        pos3: Vec3,
        elem1: &str,
        elem2: &str,
        elem3: &str,
    ) -> Self {
        // Calculate vectors from vertex (atom2) to the other two atoms
        let v1 = (pos1 - pos2).normalize();
        let v2 = (pos3 - pos2).normalize();

        // Angle between vectors using dot product: cos(θ) = v1·v2
        let dot = v1.dot(v2).clamp(-1.0, 1.0); // Clamp to avoid numerical errors
        let angle_rad = dot.acos();
        let angle_deg = angle_rad.to_degrees();

        Self {
            id,
            measurement_type: MeasurementType::Angle,
            atom_indices: vec![atom1, atom2, atom3],
            value: angle_deg,
            label: format!(
                "{}{} - {}{} - {}{}: {:.1}°",
                elem1, atom1, elem2, atom2, elem3, atom3, angle_deg
            ),
        }
    }
}

/// Manager for a collection of measurements
pub struct MeasurementManager {
    measurements: Vec<Measurement>,
    next_id: usize,
}

impl MeasurementManager {
    /// Create a new empty measurement manager
    pub fn new() -> Self {
        Self {
            measurements: Vec::new(),
            next_id: 0,
        }
    }

    /// Add a distance measurement between two atoms
    ///
    /// # Returns
    /// ID of the newly created measurement
    pub fn add_distance(
        &mut self,
        atom1: usize,
        atom2: usize,
        pos1: Vec3,
        pos2: Vec3,
        elem1: &str,
        elem2: &str,
    ) -> usize {
        let id = self.next_id;
        self.next_id += 1;
        let measurement = Measurement::new_distance(id, atom1, atom2, pos1, pos2, elem1, elem2);
        self.measurements.push(measurement);
        id
    }

    /// Add an angle measurement between three atoms
    ///
    /// # Returns
    /// ID of the newly created measurement
    pub fn add_angle(
        &mut self,
        atom1: usize,
        atom2: usize,
        atom3: usize,
        pos1: Vec3,
        pos2: Vec3,
        pos3: Vec3,
        elem1: &str,
        elem2: &str,
        elem3: &str,
    ) -> usize {
        let id = self.next_id;
        self.next_id += 1;
        let measurement = Measurement::new_angle(
            id, atom1, atom2, atom3, pos1, pos2, pos3, elem1, elem2, elem3
        );
        self.measurements.push(measurement);
        id
    }

    /// Remove a measurement by ID
    pub fn remove(&mut self, id: usize) {
        self.measurements.retain(|m| m.id != id);
    }

    /// Remove all measurements
    pub fn clear(&mut self) {
        self.measurements.clear();
    }

    /// Get all measurements
    pub fn get_all(&self) -> &[Measurement] {
        &self.measurements
    }

    /// Get a specific measurement by ID
    pub fn get(&self, id: usize) -> Option<&Measurement> {
        self.measurements.iter().find(|m| m.id == id)
    }
}

impl Default for MeasurementManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_distance_calculation() {
        let pos1 = Vec3::new(0.0, 0.0, 0.0);
        let pos2 = Vec3::new(3.0, 4.0, 0.0);
        let m = Measurement::new_distance(0, 0, 1, pos1, pos2, "C", "O");

        assert_eq!(m.measurement_type, MeasurementType::Distance);
        assert_eq!(m.atom_indices, vec![0, 1]);
        assert!((m.value - 5.0).abs() < 0.01); // 3-4-5 triangle
        assert!(m.label.contains("5.00"));
    }

    #[test]
    fn test_angle_calculation_90deg() {
        let pos1 = Vec3::new(1.0, 0.0, 0.0);
        let pos2 = Vec3::new(0.0, 0.0, 0.0); // Vertex at origin
        let pos3 = Vec3::new(0.0, 1.0, 0.0);
        let m = Measurement::new_angle(0, 0, 1, 2, pos1, pos2, pos3, "C", "N", "O");

        assert_eq!(m.measurement_type, MeasurementType::Angle);
        assert_eq!(m.atom_indices, vec![0, 1, 2]);
        assert!((m.value - 90.0).abs() < 0.1); // 90 degree angle
    }

    #[test]
    fn test_angle_calculation_180deg() {
        let pos1 = Vec3::new(-1.0, 0.0, 0.0);
        let pos2 = Vec3::new(0.0, 0.0, 0.0);
        let pos3 = Vec3::new(1.0, 0.0, 0.0);
        let m = Measurement::new_angle(0, 0, 1, 2, pos1, pos2, pos3, "C", "N", "O");

        assert!((m.value - 180.0).abs() < 0.1); // 180 degree angle (straight line)
    }

    #[test]
    fn test_measurement_manager_add_remove() {
        let mut manager = MeasurementManager::new();

        let id1 = manager.add_distance(
            0, 1,
            Vec3::ZERO,
            Vec3::new(1.0, 0.0, 0.0),
            "C", "O"
        );

        let id2 = manager.add_angle(
            0, 1, 2,
            Vec3::new(1.0, 0.0, 0.0),
            Vec3::ZERO,
            Vec3::new(0.0, 1.0, 0.0),
            "C", "N", "O"
        );

        assert_eq!(manager.get_all().len(), 2);
        assert!(manager.get(id1).is_some());
        assert!(manager.get(id2).is_some());

        manager.remove(id1);
        assert_eq!(manager.get_all().len(), 1);
        assert!(manager.get(id1).is_none());
        assert!(manager.get(id2).is_some());

        manager.clear();
        assert_eq!(manager.get_all().len(), 0);
    }

    #[test]
    fn test_measurement_manager_unique_ids() {
        let mut manager = MeasurementManager::new();

        let id1 = manager.add_distance(
            0, 1,
            Vec3::ZERO,
            Vec3::new(1.0, 0.0, 0.0),
            "C", "O"
        );

        let id2 = manager.add_distance(
            2, 3,
            Vec3::ZERO,
            Vec3::new(2.0, 0.0, 0.0),
            "C", "N"
        );

        assert_ne!(id1, id2);
        assert_eq!(id1, 0);
        assert_eq!(id2, 1);
    }
}

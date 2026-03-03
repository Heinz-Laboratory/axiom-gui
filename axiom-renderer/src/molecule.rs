//! Molecular structure representation and bond detection
//!
//! Handles conversion of parsed CIF data to renderable molecular structures
//! with automatic bond detection based on atomic distances.

use crate::cif_parser::CifStructure;

/// A complete molecular structure ready for rendering
#[derive(Debug, Clone)]
pub struct Molecule {
    pub atoms: Vec<MoleculeAtom>,
    pub bonds: Vec<Bond>,
    /// Bounding box for camera fitting: [min_x, min_y, min_z, max_x, max_y, max_z]
    pub bounds: [f32; 6],
}

/// An atom in a molecule with rendering properties
#[derive(Debug, Clone)]
pub struct MoleculeAtom {
    pub element: String,
    pub label: String,
    pub position: [f32; 3],
    pub radius: f32,
    pub color: [f32; 3],
}

/// A bond between two atoms
#[derive(Debug, Clone)]
pub struct Bond {
    pub atom_a: usize,
    pub atom_b: usize,
    pub length: f32,
}

/// Element data for rendering (CPK colors and van der Waals radii)
struct ElementData {
    color: [f32; 3],
    radius: f32,
}

/// Get CPK color and radius for an element symbol
fn get_element_data(symbol: &str) -> ElementData {
    match symbol {
        // Common elements with CPK colors
        "H" => ElementData { color: [1.0, 1.0, 1.0], radius: 0.25 },      // White
        "C" => ElementData { color: [0.5, 0.5, 0.5], radius: 0.70 },      // Gray
        "N" => ElementData { color: [0.0, 0.0, 1.0], radius: 0.65 },      // Blue
        "O" => ElementData { color: [1.0, 0.0, 0.0], radius: 0.60 },      // Red
        "F" => ElementData { color: [0.0, 1.0, 0.0], radius: 0.50 },      // Green
        "P" => ElementData { color: [1.0, 0.5, 0.0], radius: 1.00 },      // Orange
        "S" => ElementData { color: [1.0, 1.0, 0.0], radius: 1.00 },      // Yellow
        "Cl" => ElementData { color: [0.0, 1.0, 0.0], radius: 0.99 },     // Green
        "Br" => ElementData { color: [0.6, 0.1, 0.0], radius: 1.14 },     // Dark red
        "I" => ElementData { color: [0.5, 0.0, 0.5], radius: 1.33 },      // Purple

        // Metals
        "Fe" => ElementData { color: [0.9, 0.4, 0.0], radius: 1.26 },     // Orange
        "Cu" => ElementData { color: [0.8, 0.5, 0.2], radius: 1.28 },     // Copper
        "Zn" => ElementData { color: [0.5, 0.6, 0.7], radius: 1.34 },     // Blue-gray
        "Mg" => ElementData { color: [0.0, 1.0, 0.0], radius: 1.60 },     // Green
        "Ca" => ElementData { color: [0.5, 0.5, 0.5], radius: 1.97 },     // Gray
        "Na" => ElementData { color: [0.0, 0.0, 1.0], radius: 1.86 },     // Blue
        "K" => ElementData { color: [0.5, 0.0, 0.5], radius: 2.27 },      // Purple

        // Heavy metals and actinides
        "Pb" => ElementData { color: [0.34, 0.35, 0.38], radius: 1.75 },  // Dark gray
        "Co" => ElementData { color: [0.0, 0.0, 0.6], radius: 1.26 },     // Dark blue

        // Silicon and germanium (semiconductors)
        "Si" => ElementData { color: [0.6, 0.6, 0.7], radius: 1.11 },     // Gray-blue
        "Ge" => ElementData { color: [0.4, 0.6, 0.6], radius: 1.25 },     // Teal

        // Noble gases
        "He" => ElementData { color: [0.0, 1.0, 1.0], radius: 0.31 },     // Cyan
        "Ne" => ElementData { color: [0.0, 1.0, 1.0], radius: 0.38 },     // Cyan
        "Ar" => ElementData { color: [0.0, 1.0, 1.0], radius: 0.71 },     // Cyan

        // Default for unknown elements
        _ => ElementData { color: [1.0, 0.0, 1.0], radius: 1.00 },        // Magenta
    }
}

/// Convert CIF structure to a molecule with bonds
pub fn create_molecule(structure: &CifStructure) -> Molecule {
    let mut atoms = Vec::new();
    let mut min_pos = [f32::INFINITY; 3];
    let mut max_pos = [f32::NEG_INFINITY; 3];

    // Convert atoms and compute bounds
    for atom in &structure.atoms {
        let element_data = get_element_data(&atom.element);

        atoms.push(MoleculeAtom {
            element: atom.element.clone(),
            label: atom.label.clone(),
            position: atom.position,
            radius: element_data.radius,
            color: element_data.color,
        });

        // Update bounds
        for i in 0..3 {
            min_pos[i] = min_pos[i].min(atom.position[i]);
            max_pos[i] = max_pos[i].max(atom.position[i]);
        }
    }

    // Detect bonds
    let bonds = detect_bonds(&atoms);

    // Set bounds
    let bounds = [
        min_pos[0], min_pos[1], min_pos[2],
        max_pos[0], max_pos[1], max_pos[2],
    ];

    Molecule {
        atoms,
        bonds,
        bounds,
    }
}

/// Detect bonds based on atomic distances
///
/// Uses element-specific distance thresholds (sum of covalent radii + tolerance)
fn detect_bonds(atoms: &[MoleculeAtom]) -> Vec<Bond> {
    let mut bonds = Vec::new();

    // For each pair of atoms
    for i in 0..atoms.len() {
        for j in (i + 1)..atoms.len() {
            let atom_a = &atoms[i];
            let atom_b = &atoms[j];

            let distance = calculate_distance(atom_a.position, atom_b.position);

            // Bond threshold: sum of radii * 1.2 (20% tolerance)
            let threshold = (atom_a.radius + atom_b.radius) * 1.2;

            // Don't create bonds that are too long (likely non-bonded)
            // Max reasonable bond length: 3.5 Angstroms
            if distance <= threshold && distance <= 3.5 {
                bonds.push(Bond {
                    atom_a: i,
                    atom_b: j,
                    length: distance,
                });
            }
        }
    }

    bonds
}

/// Calculate Euclidean distance between two points
fn calculate_distance(a: [f32; 3], b: [f32; 3]) -> f32 {
    let dx = a[0] - b[0];
    let dy = a[1] - b[1];
    let dz = a[2] - b[2];
    (dx * dx + dy * dy + dz * dz).sqrt()
}

/// Get covalent radius for an element (for bond detection)
/// These are approximate single-bond covalent radii in Angstroms
fn _get_covalent_radius(symbol: &str) -> f32 {
    match symbol {
        "H" => 0.31,
        "C" => 0.76,
        "N" => 0.71,
        "O" => 0.66,
        "F" => 0.57,
        "P" => 1.07,
        "S" => 1.05,
        "Cl" => 1.02,
        "Br" => 1.20,
        "I" => 1.39,
        "Si" => 1.11,
        "Fe" => 1.32,
        "Cu" => 1.32,
        "Zn" => 1.22,
        "Mg" => 1.41,
        "Ca" => 1.76,
        "Na" => 1.66,
        "K" => 2.03,
        "Pb" => 1.46,
        "Co" => 1.26,
        _ => 1.00,  // Default
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_element_data() {
        let carbon = get_element_data("C");
        assert_eq!(carbon.color, [0.5, 0.5, 0.5]);
        assert_eq!(carbon.radius, 0.70);

        let oxygen = get_element_data("O");
        assert_eq!(oxygen.color, [1.0, 0.0, 0.0]);

        let unknown = get_element_data("Xx");
        assert_eq!(unknown.color, [1.0, 0.0, 1.0]);  // Magenta for unknown
    }

    #[test]
    fn test_calculate_distance() {
        let a = [0.0, 0.0, 0.0];
        let b = [3.0, 4.0, 0.0];
        let dist = calculate_distance(a, b);
        assert!((dist - 5.0).abs() < 0.001);
    }

    #[test]
    fn test_bond_detection() {
        // Create two carbon atoms close enough to bond
        let atoms = vec![
            MoleculeAtom {
                element: "C".to_string(),
                label: "C1".to_string(),
                position: [0.0, 0.0, 0.0],
                radius: 0.70,
                color: [0.5, 0.5, 0.5],
            },
            MoleculeAtom {
                element: "C".to_string(),
                label: "C2".to_string(),
                position: [1.5, 0.0, 0.0],  // 1.5 Angstroms apart
                radius: 0.70,
                color: [0.5, 0.5, 0.5],
            },
        ];

        let bonds = detect_bonds(&atoms);
        assert_eq!(bonds.len(), 1);
        assert_eq!(bonds[0].atom_a, 0);
        assert_eq!(bonds[0].atom_b, 1);
        assert!((bonds[0].length - 1.5).abs() < 0.001);
    }

    #[test]
    fn test_no_bond_when_too_far() {
        // Create two atoms too far to bond
        let atoms = vec![
            MoleculeAtom {
                element: "C".to_string(),
                label: "C1".to_string(),
                position: [0.0, 0.0, 0.0],
                radius: 0.70,
                color: [0.5, 0.5, 0.5],
            },
            MoleculeAtom {
                element: "C".to_string(),
                label: "C2".to_string(),
                position: [10.0, 0.0, 0.0],  // 10 Angstroms apart
                radius: 0.70,
                color: [0.5, 0.5, 0.5],
            },
        ];

        let bonds = detect_bonds(&atoms);
        assert_eq!(bonds.len(), 0);
    }
}

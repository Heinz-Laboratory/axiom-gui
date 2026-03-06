//! Molecular structure representation and bond detection.
//!
//! Converts parsed structures into renderable molecules and uses explicit bond
//! data when available, falling back to covalent-radius bond detection.

use std::collections::HashSet;

use crate::structure::{Structure, StructureBond};

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

struct ElementData {
    color: [f32; 3],
    radius: f32,
}

fn get_element_data(symbol: &str) -> ElementData {
    match symbol {
        "H" => ElementData { color: [1.0, 1.0, 1.0], radius: 0.25 },
        "C" => ElementData { color: [0.5, 0.5, 0.5], radius: 0.70 },
        "N" => ElementData { color: [0.0, 0.0, 1.0], radius: 0.65 },
        "O" => ElementData { color: [1.0, 0.0, 0.0], radius: 0.60 },
        "F" => ElementData { color: [0.0, 1.0, 0.0], radius: 0.50 },
        "P" => ElementData { color: [1.0, 0.5, 0.0], radius: 1.00 },
        "S" => ElementData { color: [1.0, 1.0, 0.0], radius: 1.00 },
        "Cl" => ElementData { color: [0.0, 1.0, 0.0], radius: 0.99 },
        "Br" => ElementData { color: [0.6, 0.1, 0.0], radius: 1.14 },
        "I" => ElementData { color: [0.5, 0.0, 0.5], radius: 1.33 },
        "Fe" => ElementData { color: [0.9, 0.4, 0.0], radius: 1.26 },
        "Cu" => ElementData { color: [0.8, 0.5, 0.2], radius: 1.28 },
        "Zn" => ElementData { color: [0.5, 0.6, 0.7], radius: 1.34 },
        "Mg" => ElementData { color: [0.0, 1.0, 0.0], radius: 1.60 },
        "Ca" => ElementData { color: [0.5, 0.5, 0.5], radius: 1.97 },
        "Na" => ElementData { color: [0.0, 0.0, 1.0], radius: 1.86 },
        "K" => ElementData { color: [0.5, 0.0, 0.5], radius: 2.27 },
        "Pb" => ElementData { color: [0.34, 0.35, 0.38], radius: 1.75 },
        "Co" => ElementData { color: [0.0, 0.0, 0.6], radius: 1.26 },
        "Si" => ElementData { color: [0.6, 0.6, 0.7], radius: 1.11 },
        "Ge" => ElementData { color: [0.4, 0.6, 0.6], radius: 1.25 },
        "He" => ElementData { color: [0.0, 1.0, 1.0], radius: 0.31 },
        "Ne" => ElementData { color: [0.0, 1.0, 1.0], radius: 0.38 },
        "Ar" => ElementData { color: [0.0, 1.0, 1.0], radius: 0.71 },
        _ => ElementData { color: [1.0, 0.0, 1.0], radius: 1.00 },
    }
}

pub fn create_molecule(structure: &Structure) -> Molecule {
    let mut atoms = Vec::with_capacity(structure.atoms.len());
    let mut min_pos = [f32::INFINITY; 3];
    let mut max_pos = [f32::NEG_INFINITY; 3];

    for atom in &structure.atoms {
        let element_data = get_element_data(&atom.element);
        atoms.push(MoleculeAtom {
            element: atom.element.clone(),
            label: atom.label.clone(),
            position: atom.position,
            radius: element_data.radius,
            color: element_data.color,
        });

        for i in 0..3 {
            min_pos[i] = min_pos[i].min(atom.position[i]);
            max_pos[i] = max_pos[i].max(atom.position[i]);
        }
    }

    let bounds = if atoms.is_empty() {
        [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    } else {
        [
            min_pos[0], min_pos[1], min_pos[2],
            max_pos[0], max_pos[1], max_pos[2],
        ]
    };

    let bonds = build_bonds(&atoms, &structure.bonds);

    Molecule { atoms, bonds, bounds }
}

fn build_bonds(atoms: &[MoleculeAtom], explicit_bonds: &[StructureBond]) -> Vec<Bond> {
    if atoms.is_empty() {
        return Vec::new();
    }

    if explicit_bonds.is_empty() {
        return detect_bonds(atoms);
    }

    let mut bonds = explicit_bonds_to_bonds(atoms, explicit_bonds);

    // Some formats provide partial explicit bonds (e.g. ligand-only CONECT in PDB).
    // If the explicit bond graph clearly covers only a small fraction of the structure,
    // supplement it with distance-based detection for the remaining pairs.
    if explicit_bonds.len() * 2 < atoms.len() {
        let mut seen: HashSet<(usize, usize)> = bonds
            .iter()
            .map(|bond| canonical_pair(bond.atom_a, bond.atom_b))
            .collect();

        for detected in detect_bonds(atoms) {
            let key = canonical_pair(detected.atom_a, detected.atom_b);
            if seen.insert(key) {
                bonds.push(detected);
            }
        }
    }

    bonds
}

fn explicit_bonds_to_bonds(atoms: &[MoleculeAtom], explicit_bonds: &[StructureBond]) -> Vec<Bond> {
    let mut seen = HashSet::new();
    let mut bonds = Vec::new();

    for bond in explicit_bonds {
        if bond.atom_a >= atoms.len() || bond.atom_b >= atoms.len() || bond.atom_a == bond.atom_b {
            continue;
        }

        let key = canonical_pair(bond.atom_a, bond.atom_b);
        if !seen.insert(key) {
            continue;
        }

        let atom_a = &atoms[key.0];
        let atom_b = &atoms[key.1];
        bonds.push(Bond {
            atom_a: key.0,
            atom_b: key.1,
            length: calculate_distance(atom_a.position, atom_b.position),
        });
    }

    bonds
}

fn detect_bonds(atoms: &[MoleculeAtom]) -> Vec<Bond> {
    let mut bonds = Vec::new();

    for i in 0..atoms.len() {
        for j in (i + 1)..atoms.len() {
            let atom_a = &atoms[i];
            let atom_b = &atoms[j];
            let distance = calculate_distance(atom_a.position, atom_b.position);
            let threshold = bond_threshold(atom_a, atom_b);

            if distance <= threshold {
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

fn bond_threshold(atom_a: &MoleculeAtom, atom_b: &MoleculeAtom) -> f32 {
    let covalent_sum = get_covalent_radius(&atom_a.element) + get_covalent_radius(&atom_b.element);
    let tolerance = if atom_a.element == "H" || atom_b.element == "H" { 0.25 } else { 0.45 };
    (covalent_sum + tolerance).min(3.2)
}

fn calculate_distance(a: [f32; 3], b: [f32; 3]) -> f32 {
    let dx = a[0] - b[0];
    let dy = a[1] - b[1];
    let dz = a[2] - b[2];
    (dx * dx + dy * dy + dz * dz).sqrt()
}

fn canonical_pair(atom_a: usize, atom_b: usize) -> (usize, usize) {
    if atom_a < atom_b {
        (atom_a, atom_b)
    } else {
        (atom_b, atom_a)
    }
}

fn get_covalent_radius(symbol: &str) -> f32 {
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
        _ => 1.00,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::structure::{Structure, StructureAtom, StructureBond};

    #[test]
    fn test_get_element_data() {
        let carbon = get_element_data("C");
        assert_eq!(carbon.color, [0.5, 0.5, 0.5]);
        assert_eq!(carbon.radius, 0.70);

        let oxygen = get_element_data("O");
        assert_eq!(oxygen.color, [1.0, 0.0, 0.0]);

        let unknown = get_element_data("Xx");
        assert_eq!(unknown.color, [1.0, 0.0, 1.0]);
    }

    #[test]
    fn test_calculate_distance() {
        let dist = calculate_distance([0.0, 0.0, 0.0], [3.0, 4.0, 0.0]);
        assert!((dist - 5.0).abs() < 0.001);
    }

    #[test]
    fn test_bond_detection() {
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
                position: [1.5, 0.0, 0.0],
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
                position: [10.0, 0.0, 0.0],
                radius: 0.70,
                color: [0.5, 0.5, 0.5],
            },
        ];

        assert_eq!(detect_bonds(&atoms).len(), 0);
    }

    #[test]
    fn test_create_molecule_uses_explicit_bonds() {
        let structure = Structure {
            atoms: vec![
                StructureAtom {
                    element: "C".to_string(),
                    label: "C1".to_string(),
                    position: [0.0, 0.0, 0.0],
                },
                StructureAtom {
                    element: "O".to_string(),
                    label: "O1".to_string(),
                    position: [5.0, 0.0, 0.0],
                },
            ],
            bonds: vec![StructureBond {
                atom_a: 0,
                atom_b: 1,
                order: Some(1),
            }],
            cell: None,
            space_group: None,
            name: None,
        };

        let molecule = create_molecule(&structure);
        assert_eq!(molecule.bonds.len(), 1);
        assert!((molecule.bonds[0].length - 5.0).abs() < 0.001);
    }
}

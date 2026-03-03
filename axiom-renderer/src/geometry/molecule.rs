//! Molecular geometry conversion for GPU rendering
//!
//! Converts parsed molecular structures into GPU-ready instance buffers
//! for efficient rendering of atoms (spheres) and bonds (cylinders).

use crate::molecule::Molecule;
use bytemuck::{Pod, Zeroable};
use wgpu::util::DeviceExt;

/// Instance data for rendering a single atom as a sphere
#[repr(C)]
#[derive(Copy, Clone, Debug, Pod, Zeroable)]
pub struct AtomInstance {
    /// World-space position of the atom center
    pub position: [f32; 3],
    /// Atom radius for sphere scaling
    pub radius: f32,
    /// RGB color (CPK color scheme)
    pub color: [f32; 3],
    /// Padding to 16-byte alignment
    pub _padding: f32,
}

impl AtomInstance {
    const ATTRIBS: [wgpu::VertexAttribute; 2] = wgpu::vertex_attr_array![
        2 => Float32x4,  // position (xyz) + radius (w)
        3 => Float32x4,  // color (rgb) + padding (w)
    ];

    pub fn desc() -> wgpu::VertexBufferLayout<'static> {
        wgpu::VertexBufferLayout {
            array_stride: std::mem::size_of::<AtomInstance>() as wgpu::BufferAddress,
            step_mode: wgpu::VertexStepMode::Instance,
            attributes: &Self::ATTRIBS,
        }
    }
}

/// Instance data for rendering a single bond as a cylinder
#[repr(C)]
#[derive(Copy, Clone, Debug, Pod, Zeroable)]
pub struct BondInstance {
    /// Start position (xyz) and radius (w)
    pub start_radius: [f32; 4],
    /// End position (xyz) and length (w) - length for validation/debugging
    pub end_length: [f32; 4],
    /// Color (rgb) and padding (w)
    pub color_pad: [f32; 4],
}

impl BondInstance {
    const ATTRIBS: [wgpu::VertexAttribute; 3] = wgpu::vertex_attr_array![
        2 => Float32x4,  // start (xyz) + radius (w)
        3 => Float32x4,  // end (xyz) + length (w)
        4 => Float32x4,  // color (rgb) + padding (w)
    ];

    pub fn desc() -> wgpu::VertexBufferLayout<'static> {
        wgpu::VertexBufferLayout {
            array_stride: std::mem::size_of::<BondInstance>() as wgpu::BufferAddress,
            step_mode: wgpu::VertexStepMode::Instance,
            attributes: &Self::ATTRIBS,
        }
    }
}

/// Complete GPU-ready geometry for a molecular structure
#[derive(Debug, Clone)]
pub struct MoleculeGeometry {
    /// Instance data for all atoms
    pub atom_instances: Vec<AtomInstance>,
    /// Instance data for all bonds
    pub bond_instances: Vec<BondInstance>,
    /// Bounding box: [min_x, min_y, min_z, max_x, max_y, max_z]
    pub bounds: [f32; 6],
}

impl MoleculeGeometry {
    /// Convert a parsed Molecule into GPU-ready geometry
    pub fn from_molecule(molecule: &Molecule) -> Self {
        let mut atom_instances = Vec::with_capacity(molecule.atoms.len());

        // Convert atoms to instances
        for atom in &molecule.atoms {
            atom_instances.push(AtomInstance {
                position: atom.position,
                radius: atom.radius,
                color: atom.color,
                _padding: 0.0,
            });
        }

        // Convert bonds to instances
        let bond_instances = Self::create_bond_instances(molecule);

        MoleculeGeometry {
            atom_instances,
            bond_instances,
            bounds: molecule.bounds,
        }
    }

    /// Create bond instances from molecule bonds
    fn create_bond_instances(molecule: &Molecule) -> Vec<BondInstance> {
        let mut instances = Vec::with_capacity(molecule.bonds.len());

        for bond in &molecule.bonds {
            // Get atom positions
            let atom_a = &molecule.atoms[bond.atom_a];
            let atom_b = &molecule.atoms[bond.atom_b];

            // Average the atom colors for bond color
            let color_r = (atom_a.color[0] + atom_b.color[0]) / 2.0;
            let color_g = (atom_a.color[1] + atom_b.color[1]) / 2.0;
            let color_b = (atom_a.color[2] + atom_b.color[2]) / 2.0;

            // Bond radius is typically 0.15 Ångströms for ball-and-stick
            const BOND_RADIUS: f32 = 0.15;

            instances.push(BondInstance {
                start_radius: [
                    atom_a.position[0],
                    atom_a.position[1],
                    atom_a.position[2],
                    BOND_RADIUS,
                ],
                end_length: [
                    atom_b.position[0],
                    atom_b.position[1],
                    atom_b.position[2],
                    bond.length,
                ],
                color_pad: [color_r, color_g, color_b, 0.0],
            });
        }

        instances
    }

    /// Get the center point of the molecule bounding box
    pub fn center(&self) -> [f32; 3] {
        [
            (self.bounds[0] + self.bounds[3]) / 2.0,
            (self.bounds[1] + self.bounds[4]) / 2.0,
            (self.bounds[2] + self.bounds[5]) / 2.0,
        ]
    }

    /// Get the diagonal size of the bounding box (for camera fitting)
    pub fn diagonal(&self) -> f32 {
        let dx = self.bounds[3] - self.bounds[0];
        let dy = self.bounds[4] - self.bounds[1];
        let dz = self.bounds[5] - self.bounds[2];
        (dx * dx + dy * dy + dz * dz).sqrt()
    }

    /// Create GPU buffer for atom instances
    pub fn create_atom_buffer(&self, device: &wgpu::Device) -> Option<wgpu::Buffer> {
        if self.atom_instances.is_empty() {
            return None;
        }

        Some(device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("atom-instance-buffer"),
            contents: bytemuck::cast_slice(&self.atom_instances),
            usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
        }))
    }

    /// Create GPU buffer for bond instances
    pub fn create_bond_buffer(&self, device: &wgpu::Device) -> Option<wgpu::Buffer> {
        if self.bond_instances.is_empty() {
            return None;
        }

        Some(device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("bond-instance-buffer"),
            contents: bytemuck::cast_slice(&self.bond_instances),
            usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::molecule::{Molecule, MoleculeAtom, Bond};

    #[test]
    fn test_atom_instance_creation() {
        let molecule = Molecule {
            atoms: vec![
                MoleculeAtom {
                    element: "C".to_string(),
                    label: "C1".to_string(),
                    position: [0.0, 0.0, 0.0],
                    radius: 0.7,
                    color: [0.5, 0.5, 0.5],
                },
                MoleculeAtom {
                    element: "O".to_string(),
                    label: "O1".to_string(),
                    position: [1.5, 0.0, 0.0],
                    radius: 0.6,
                    color: [1.0, 0.0, 0.0],
                },
            ],
            bonds: vec![],
            bounds: [-0.7, -0.7, -0.7, 2.1, 0.6, 0.6],
        };

        let geometry = MoleculeGeometry::from_molecule(&molecule);

        assert_eq!(geometry.atom_instances.len(), 2);
        assert_eq!(geometry.atom_instances[0].position, [0.0, 0.0, 0.0]);
        assert_eq!(geometry.atom_instances[0].radius, 0.7);
        assert_eq!(geometry.atom_instances[1].color, [1.0, 0.0, 0.0]);
    }

    #[test]
    fn test_bond_instance_creation() {
        let molecule = Molecule {
            atoms: vec![
                MoleculeAtom {
                    element: "C".to_string(),
                    label: "C1".to_string(),
                    position: [0.0, 0.0, 0.0],
                    radius: 0.7,
                    color: [0.5, 0.5, 0.5],
                },
                MoleculeAtom {
                    element: "O".to_string(),
                    label: "O1".to_string(),
                    position: [1.5, 0.0, 0.0],
                    radius: 0.6,
                    color: [1.0, 0.0, 0.0],
                },
            ],
            bonds: vec![Bond {
                atom_a: 0,
                atom_b: 1,
                length: 1.5,
            }],
            bounds: [-0.7, -0.7, -0.7, 2.1, 0.6, 0.6],
        };

        let geometry = MoleculeGeometry::from_molecule(&molecule);

        assert_eq!(geometry.bond_instances.len(), 1);

        // Check start position and radius
        assert_eq!(geometry.bond_instances[0].start_radius[0], 0.0);
        assert_eq!(geometry.bond_instances[0].start_radius[1], 0.0);
        assert_eq!(geometry.bond_instances[0].start_radius[2], 0.0);
        assert_eq!(geometry.bond_instances[0].start_radius[3], 0.15);  // BOND_RADIUS

        // Check end position and length
        assert_eq!(geometry.bond_instances[0].end_length[0], 1.5);
        assert_eq!(geometry.bond_instances[0].end_length[1], 0.0);
        assert_eq!(geometry.bond_instances[0].end_length[2], 0.0);
        assert_eq!(geometry.bond_instances[0].end_length[3], 1.5);  // bond length

        // Color should be average of C (gray) and O (red)
        assert_eq!(geometry.bond_instances[0].color_pad[0], 0.75);
        assert_eq!(geometry.bond_instances[0].color_pad[1], 0.25);
        assert_eq!(geometry.bond_instances[0].color_pad[2], 0.25);
    }

    #[test]
    fn test_bounding_box_calculations() {
        let molecule = Molecule {
            atoms: vec![
                MoleculeAtom {
                    element: "C".to_string(),
                    label: "C1".to_string(),
                    position: [0.0, 0.0, 0.0],
                    radius: 0.7,
                    color: [0.5, 0.5, 0.5],
                },
            ],
            bonds: vec![],
            bounds: [-1.0, -2.0, -3.0, 4.0, 5.0, 6.0],
        };

        let geometry = MoleculeGeometry::from_molecule(&molecule);

        let center = geometry.center();
        assert_eq!(center, [1.5, 1.5, 1.5]);

        // Diagonal = sqrt((4-(-1))^2 + (5-(-2))^2 + (6-(-3))^2) = sqrt(25 + 49 + 81) = sqrt(155)
        let diagonal = geometry.diagonal();
        assert!((diagonal - 12.45).abs() < 0.01);
    }
}

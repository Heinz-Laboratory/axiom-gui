// axiom-renderer/src/geometry/mod.rs
// Mesh generation utilities for atoms (spheres) and bonds (cylinders)

pub mod molecule;

use bytemuck::{Pod, Zeroable};

#[repr(C)]
#[derive(Copy, Clone, Debug, Pod, Zeroable)]
pub struct Vertex {
    pub position: [f32; 3],
    pub normal: [f32; 3],
}

impl Vertex {
    const ATTRIBS: [wgpu::VertexAttribute; 2] = wgpu::vertex_attr_array![
        0 => Float32x3,
        1 => Float32x3,
    ];

    pub fn desc() -> wgpu::VertexBufferLayout<'static> {
        wgpu::VertexBufferLayout {
            array_stride: std::mem::size_of::<Vertex>() as wgpu::BufferAddress,
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &Self::ATTRIBS,
        }
    }
}

/// Generate UV sphere mesh (used for atoms)
/// Returns (vertices, indices)
#[allow(dead_code)]
pub fn generate_sphere(segments: u32, rings: u32) -> (Vec<Vertex>, Vec<u16>) {
    let mut vertices = Vec::new();
    let mut indices = Vec::new();

    // Generate vertices
    for ring in 0..=rings {
        let phi = std::f32::consts::PI * ring as f32 / rings as f32;
        let y = phi.cos();
        let ring_radius = phi.sin();

        for segment in 0..=segments {
            let theta = 2.0 * std::f32::consts::PI * segment as f32 / segments as f32;
            let x = ring_radius * theta.cos();
            let z = ring_radius * theta.sin();

            let position = [x, y, z];
            let normal = [x, y, z];  // For unit sphere, normal = position

            vertices.push(Vertex { position, normal });
        }
    }

    // Generate indices
    for ring in 0..rings {
        for segment in 0..segments {
            let current_ring_start = ring * (segments + 1);
            let next_ring_start = (ring + 1) * (segments + 1);

            let a = (current_ring_start + segment) as u16;
            let b = (next_ring_start + segment) as u16;
            let c = (next_ring_start + segment + 1) as u16;
            let d = (current_ring_start + segment + 1) as u16;

            // Two triangles per quad
            indices.extend_from_slice(&[a, b, c, a, c, d]);
        }
    }

    (vertices, indices)
}

/// Generate cylinder mesh (used for bonds)
/// Returns (vertices, indices)
#[allow(dead_code)]
pub fn generate_cylinder(segments: u32) -> (Vec<Vertex>, Vec<u16>) {
    let mut vertices = Vec::new();
    let mut indices = Vec::new();

    // Generate side vertices (two rings at y = -0.5 and y = 0.5)
    for ring in 0..2 {
        let y = if ring == 0 { -0.5 } else { 0.5 };

        for segment in 0..=segments {
            let theta = 2.0 * std::f32::consts::PI * segment as f32 / segments as f32;
            let x = theta.cos();
            let z = theta.sin();

            let position = [x, y, z];
            let normal = [x, 0.0, z];  // Cylinder side normal

            vertices.push(Vertex { position, normal });
        }
    }

    // Generate side indices
    for segment in 0..segments {
        let a = segment as u16;
        let b = (segment + segments + 1) as u16;
        let c = (segment + segments + 2) as u16;
        let d = (segment + 1) as u16;

        // Two triangles per quad
        indices.extend_from_slice(&[a, b, c, a, c, d]);
    }

    // Cap vertices and indices
    let cap_base = vertices.len() as u16;

    // Bottom cap
    let bottom_center = vertices.len();
    vertices.push(Vertex {
        position: [0.0, -0.5, 0.0],
        normal: [0.0, -1.0, 0.0],
    });

    for segment in 0..segments {
        let theta = 2.0 * std::f32::consts::PI * segment as f32 / segments as f32;
        let x = theta.cos();
        let z = theta.sin();
        vertices.push(Vertex {
            position: [x, -0.5, z],
            normal: [0.0, -1.0, 0.0],
        });
    }

    for segment in 0..segments {
        let a = bottom_center as u16;
        let b = cap_base + (segment as u16) + 1;
        let c = cap_base + (((segment + 1) % segments) as u16) + 1;
        indices.extend_from_slice(&[a, c, b]);  // Reversed winding for bottom
    }

    // Top cap
    let top_base = vertices.len();
    let top_center = vertices.len();
    vertices.push(Vertex {
        position: [0.0, 0.5, 0.0],
        normal: [0.0, 1.0, 0.0],
    });

    for segment in 0..segments {
        let theta = 2.0 * std::f32::consts::PI * segment as f32 / segments as f32;
        let x = theta.cos();
        let z = theta.sin();
        vertices.push(Vertex {
            position: [x, 0.5, z],
            normal: [0.0, 1.0, 0.0],
        });
    }

    for segment in 0..segments {
        let a = top_center as u16;
        let b = top_base as u16 + segment as u16 + 1;
        let c = top_base as u16 + ((segment + 1) % segments) as u16 + 1;
        indices.extend_from_slice(&[a, b, c]);
    }

    (vertices, indices)
}

// axiom-renderer/src/lib.rs
// Public API for axiom-renderer crate

mod context;
mod camera;
mod pipeline;
mod geometry;
mod renderer;
mod picking;
mod measurement;
pub mod animation;
pub mod cif_parser;
pub mod molecule;
pub mod export;
pub mod config;
pub mod pdb_parser;
pub mod structure;
pub mod xyz_parser;

#[cfg(target_arch = "wasm32")]
mod wasm;

pub use renderer::Renderer;
pub use camera::{Camera, CameraState, CameraPreset};
pub use geometry::molecule::MoleculeGeometry;
pub use animation::{CameraAnimator, EasingFunction};
pub use structure::{CellParameters, Structure, StructureAtom, StructureBond};

#[cfg(target_arch = "wasm32")]
pub use wasm::WasmRenderer;

// Data structures for external use
#[derive(Clone, Debug)]
pub struct AtomData {
    pub position: [f32; 3],
    pub color: [f32; 3],
    pub radius: f32,
}

#[derive(Clone, Debug)]
pub struct BondData {
    pub start: [f32; 3],
    pub end: [f32; 3],
    pub color: [f32; 3],
    pub radius: f32,
}

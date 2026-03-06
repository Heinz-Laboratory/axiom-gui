//! Shared parsed structure model used by all file-format parsers.

#[derive(Debug, Clone, PartialEq)]
pub struct Structure {
    pub atoms: Vec<StructureAtom>,
    pub bonds: Vec<StructureBond>,
    pub cell: Option<CellParameters>,
    pub space_group: Option<String>,
    pub name: Option<String>,
}

impl Structure {
    pub fn new(atoms: Vec<StructureAtom>) -> Self {
        Self {
            atoms,
            bonds: Vec::new(),
            cell: None,
            space_group: None,
            name: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct StructureAtom {
    pub element: String,
    pub label: String,
    pub position: [f32; 3],
}

#[derive(Debug, Clone, PartialEq)]
pub struct StructureBond {
    pub atom_a: usize,
    pub atom_b: usize,
    pub order: Option<u8>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CellParameters {
    pub lengths: [f32; 3],
    pub angles: [f32; 3],
}

pub fn normalize_element_symbol(symbol: &str) -> String {
    let trimmed = symbol.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    let mut chars = trimmed.chars();
    let first = chars.next().unwrap().to_ascii_uppercase();
    let second = chars.next().filter(|ch| ch.is_ascii_alphabetic()).map(|ch| ch.to_ascii_lowercase());

    match second {
        Some(second) => format!("{}{}", first, second),
        None => first.to_string(),
    }
}

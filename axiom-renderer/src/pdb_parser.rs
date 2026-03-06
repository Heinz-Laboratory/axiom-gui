//! PDB (Protein Data Bank) parser.
//!
//! Supports ATOM/HETATM coordinates, optional CRYST1 cell parameters, and
//! CONECT bonds when present.

use std::collections::HashSet;

use crate::structure::{normalize_element_symbol, CellParameters, Structure, StructureAtom, StructureBond};

#[derive(Debug)]
pub enum PdbError {
    ParseError(String),
}

impl std::fmt::Display for PdbError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PdbError::ParseError(message) => write!(f, "{}", message),
        }
    }
}

impl std::error::Error for PdbError {}

pub fn parse_pdb(input: &str) -> Result<Structure, PdbError> {
    let mut atoms = Vec::new();
    let mut serial_to_index = std::collections::HashMap::new();
    let mut pending_bonds = Vec::new();
    let mut title_lines = Vec::new();
    let mut header_name: Option<String> = None;
    let mut cell = None;
    let mut space_group = None;

    for (line_num, line) in input.lines().enumerate() {
        if line.starts_with("HEADER") {
            let header = line.get(10..).unwrap_or("").trim();
            if !header.is_empty() {
                header_name = Some(header.to_string());
            }
            continue;
        }

        if line.starts_with("TITLE") {
            let title_fragment = line.get(10..).unwrap_or("").trim();
            if !title_fragment.is_empty() {
                title_lines.push(title_fragment.to_string());
            }
            continue;
        }

        if line.starts_with("CRYST1") {
            cell = Some(parse_cryst1(line, line_num + 1)?);
            let parsed_space_group = line.get(55..66).unwrap_or("").trim();
            if !parsed_space_group.is_empty() {
                space_group = Some(parsed_space_group.to_string());
            }
            continue;
        }

        if line.starts_with("ATOM") || line.starts_with("HETATM") {
            if line.len() < 54 {
                return Err(PdbError::ParseError(format!(
                    "Line {}: ATOM/HETATM record too short (need at least 54 chars)",
                    line_num + 1
                )));
            }

            let serial = parse_u32_slice(line, 6..11, line_num + 1, "serial number")?;
            let x = parse_f32_slice(line, 30..38, line_num + 1, "X coordinate")?;
            let y = parse_f32_slice(line, 38..46, line_num + 1, "Y coordinate")?;
            let z = parse_f32_slice(line, 46..54, line_num + 1, "Z coordinate")?;
            let atom_name = line.get(12..16).unwrap_or("").trim();
            let residue_name = line.get(17..20).unwrap_or("").trim();
            let residue_index = line.get(22..26).unwrap_or("").trim();
            let label = if residue_name.is_empty() {
                format!("{}{}", atom_name, serial)
            } else {
                format!("{}:{}:{}", residue_name, residue_index, atom_name)
            };

            let element = extract_element_symbol(line, atom_name);
            atoms.push(StructureAtom {
                element,
                label,
                position: [x, y, z],
            });
            serial_to_index.insert(serial, atoms.len() - 1);
            continue;
        }

        if line.starts_with("CONECT") {
            let serials: Vec<u32> = line
                .split_whitespace()
                .skip(1)
                .filter_map(|part| part.parse::<u32>().ok())
                .collect();
            if let Some((&source, targets)) = serials.split_first() {
                for &target in targets {
                    pending_bonds.push((source, target));
                }
            }
        }
    }

    if atoms.is_empty() {
        return Err(PdbError::ParseError(
            "No ATOM or HETATM records found in PDB file".to_string(),
        ));
    }

    let mut seen_bonds = HashSet::new();
    let mut bonds = Vec::new();
    for (source_serial, target_serial) in pending_bonds {
        let Some(&atom_a) = serial_to_index.get(&source_serial) else {
            continue;
        };
        let Some(&atom_b) = serial_to_index.get(&target_serial) else {
            continue;
        };
        if atom_a == atom_b {
            continue;
        }

        let key = if atom_a < atom_b {
            (atom_a, atom_b)
        } else {
            (atom_b, atom_a)
        };
        if seen_bonds.insert(key) {
            bonds.push(StructureBond {
                atom_a: key.0,
                atom_b: key.1,
                order: Some(1),
            });
        }
    }

    let mut structure = Structure::new(atoms);
    structure.bonds = bonds;
    structure.cell = cell;
    structure.space_group = space_group;
    structure.name = if !title_lines.is_empty() {
        Some(title_lines.join(" "))
    } else {
        header_name
    };

    Ok(structure)
}

fn parse_cryst1(line: &str, line_num: usize) -> Result<CellParameters, PdbError> {
    Ok(CellParameters {
        lengths: [
            parse_f32_slice(line, 6..15, line_num, "cell length a")?,
            parse_f32_slice(line, 15..24, line_num, "cell length b")?,
            parse_f32_slice(line, 24..33, line_num, "cell length c")?,
        ],
        angles: [
            parse_f32_slice(line, 33..40, line_num, "cell angle alpha")?,
            parse_f32_slice(line, 40..47, line_num, "cell angle beta")?,
            parse_f32_slice(line, 47..54, line_num, "cell angle gamma")?,
        ],
    })
}

fn parse_f32_slice(
    line: &str,
    range: std::ops::Range<usize>,
    line_num: usize,
    field: &str,
) -> Result<f32, PdbError> {
    line.get(range.clone())
        .ok_or_else(|| {
            PdbError::ParseError(format!("Line {}: cannot extract {}", line_num, field))
        })?
        .trim()
        .parse::<f32>()
        .map_err(|_| PdbError::ParseError(format!("Line {}: invalid {}", line_num, field)))
}

fn parse_u32_slice(
    line: &str,
    range: std::ops::Range<usize>,
    line_num: usize,
    field: &str,
) -> Result<u32, PdbError> {
    line.get(range.clone())
        .ok_or_else(|| {
            PdbError::ParseError(format!("Line {}: cannot extract {}", line_num, field))
        })?
        .trim()
        .parse::<u32>()
        .map_err(|_| PdbError::ParseError(format!("Line {}: invalid {}", line_num, field)))
}

fn extract_element_symbol(line: &str, atom_name: &str) -> String {
    let from_column = line.get(76..78).unwrap_or("").trim();
    if !from_column.is_empty() {
        return normalize_element_symbol(from_column);
    }

    infer_element_from_atom_name(atom_name)
}

fn infer_element_from_atom_name(atom_name: &str) -> String {
    let trimmed = atom_name.trim_start_matches(|ch: char| ch.is_ascii_digit()).trim();
    if trimmed.is_empty() {
        return "X".to_string();
    }

    let upper = trimmed.to_ascii_uppercase();
    if upper.starts_with('C') {
        return "C".to_string();
    }
    if upper.starts_with('N') {
        return "N".to_string();
    }
    if upper.starts_with('O') {
        return "O".to_string();
    }
    if upper.starts_with('S') {
        return "S".to_string();
    }
    if upper.starts_with('H') {
        return "H".to_string();
    }

    let letters: String = trimmed
        .chars()
        .filter(|ch| ch.is_ascii_alphabetic())
        .take(2)
        .collect();
    if letters.is_empty() {
        "X".to_string()
    } else {
        normalize_element_symbol(&letters)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_pdb() {
        let pdb_data = "\
ATOM      1  O   WAT A   1       0.000   0.000   0.000  1.00  0.00           O\n\
ATOM      2  H1  WAT A   1       0.757   0.586   0.000  1.00  0.00           H\n\
ATOM      3  H2  WAT A   1      -0.757   0.586   0.000  1.00  0.00           H\n\
END\n";

        let structure = parse_pdb(pdb_data).unwrap();
        assert_eq!(structure.atoms.len(), 3);
        assert_eq!(structure.atoms[0].element, "O");
        assert_eq!(structure.atoms[1].element, "H");
        assert_eq!(structure.atoms[1].position, [0.757, 0.586, 0.0]);
    }

    #[test]
    fn test_parse_pdb_with_cryst1_and_conect() {
        let pdb_data = "\
HEADER    GLYCINE\n\
TITLE     SMALL TEST STRUCTURE\n\
CRYST1   10.000   11.000   12.000  90.00  91.00  92.00 P 1           1\n\
HETATM    1  C1  GLY A   1       0.000   0.000   0.000  1.00  0.00           C\n\
HETATM    2  O1  GLY A   1       1.200   0.000   0.000  1.00  0.00           O\n\
CONECT    1    2\n\
END\n";

        let structure = parse_pdb(pdb_data).unwrap();
        assert_eq!(structure.bonds.len(), 1);
        assert_eq!(structure.bonds[0].atom_a, 0);
        assert_eq!(structure.bonds[0].atom_b, 1);
        assert_eq!(structure.cell.unwrap().lengths, [10.0, 11.0, 12.0]);
        assert_eq!(structure.space_group.as_deref(), Some("P 1"));
        assert_eq!(structure.name.as_deref(), Some("SMALL TEST STRUCTURE"));
    }

    #[test]
    fn test_fallback_element_inference_for_alpha_carbon() {
        let pdb_data = "\
ATOM      1  CA  ALA A   1      10.000  20.000  30.000  1.00  0.00\n";

        let structure = parse_pdb(pdb_data).unwrap();
        assert_eq!(structure.atoms[0].element, "C");
    }
}

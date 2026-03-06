//! XYZ structure parser.

use crate::structure::{normalize_element_symbol, Structure, StructureAtom};

#[derive(Debug)]
pub enum XyzError {
    ParseError(String),
}

impl std::fmt::Display for XyzError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            XyzError::ParseError(message) => write!(f, "{}", message),
        }
    }
}

impl std::error::Error for XyzError {}

pub fn parse_xyz(input: &str) -> Result<Structure, XyzError> {
    let mut lines = input.lines();

    let atom_count_line = lines
        .next()
        .ok_or_else(|| XyzError::ParseError("Empty file".to_string()))?;
    let expected_atom_count = atom_count_line
        .trim()
        .parse::<usize>()
        .map_err(|_| XyzError::ParseError("Invalid atom count".to_string()))?;

    let comment = lines.next().unwrap_or("").trim();
    let mut atoms = Vec::with_capacity(expected_atom_count);

    for (line_index, line) in lines.enumerate() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() < 4 {
            return Err(XyzError::ParseError(format!(
                "Invalid line {}: expected 'Element X Y Z'",
                line_index + 3
            )));
        }

        let x = parts[1].parse::<f32>().map_err(|_| {
            XyzError::ParseError(format!("Invalid X coordinate on line {}", line_index + 3))
        })?;
        let y = parts[2].parse::<f32>().map_err(|_| {
            XyzError::ParseError(format!("Invalid Y coordinate on line {}", line_index + 3))
        })?;
        let z = parts[3].parse::<f32>().map_err(|_| {
            XyzError::ParseError(format!("Invalid Z coordinate on line {}", line_index + 3))
        })?;

        let element = normalize_element_symbol(parts[0]);
        let label = format!("{}{}", element, atoms.len() + 1);
        atoms.push(StructureAtom {
            element,
            label,
            position: [x, y, z],
        });
    }

    if atoms.len() != expected_atom_count {
        return Err(XyzError::ParseError(format!(
            "Expected {} atoms, found {}",
            expected_atom_count,
            atoms.len()
        )));
    }

    let mut structure = Structure::new(atoms);
    if !comment.is_empty() {
        structure.name = Some(comment.to_string());
    }
    Ok(structure)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_xyz_simple() {
        let xyz_data = "3\nWater molecule\nO 0.0 0.0 0.0\nH 0.757 0.586 0.0\nH -0.757 0.586 0.0\n";
        let structure = parse_xyz(xyz_data).unwrap();

        assert_eq!(structure.atoms.len(), 3);
        assert_eq!(structure.name.as_deref(), Some("Water molecule"));
        assert_eq!(structure.atoms[0].element, "O");
        assert_eq!(structure.atoms[1].position, [0.757, 0.586, 0.0]);
    }

    #[test]
    fn test_parse_xyz_invalid_atom_count() {
        let xyz_data = "5\nComment\nO 0.0 0.0 0.0\nH 0.757 0.586 0.0\n";
        let result = parse_xyz(xyz_data);
        assert!(result.is_err());
    }
}

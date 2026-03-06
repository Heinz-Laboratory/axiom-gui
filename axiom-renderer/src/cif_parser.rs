//! CIF (Crystallographic Information File) parser.
//!
//! Parses atom coordinates, optional crystallographic cell parameters, and
//! explicit bond loops when present.

use std::collections::{HashMap, HashSet};

use crate::structure::{normalize_element_symbol, CellParameters, Structure, StructureAtom, StructureBond};

#[derive(Debug)]
pub enum CifError {
    MissingField(String),
    ParseError(String),
    NoDataBlock,
    SyntaxError(String),
}

impl std::fmt::Display for CifError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CifError::MissingField(field) => write!(f, "Missing required field: {}", field),
            CifError::ParseError(msg) => write!(f, "Parse error: {}", msg),
            CifError::NoDataBlock => write!(f, "No data_ block found in CIF file"),
            CifError::SyntaxError(msg) => write!(f, "Syntax error: {}", msg),
        }
    }
}

impl std::error::Error for CifError {}

/// Parse a CIF file from text.
pub fn parse_cif(input: &str) -> Result<Structure, CifError> {
    let mut lines = input.lines().peekable();
    let mut data_block = String::new();
    let mut fields: HashMap<String, String> = HashMap::new();
    let mut atom_site_rows: Vec<HashMap<String, String>> = Vec::new();
    let mut geom_bond_rows: Vec<HashMap<String, String>> = Vec::new();

    for line in lines.by_ref() {
        let trimmed = line.trim();
        if trimmed.starts_with("data_") {
            data_block = trimmed.strip_prefix("data_").unwrap_or("").to_string();
            break;
        }
    }

    if data_block.is_empty() {
        return Err(CifError::NoDataBlock);
    }

    while let Some(line) = lines.next() {
        let trimmed = line.trim();

        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        if trimmed == "loop_" {
            let mut loop_headers: Vec<String> = Vec::new();
            while let Some(header_line) = lines.peek() {
                let header_trimmed = header_line.trim();
                if header_trimmed.starts_with('_') {
                    loop_headers.push(header_trimmed.to_string());
                    lines.next();
                } else {
                    break;
                }
            }

            if is_atom_coordinate_loop(&loop_headers) {
                let loop_rows = parse_loop_rows(&mut lines, &loop_headers)?;
                #[cfg(target_arch = "wasm32")]
                web_sys::console::log_1(&format!("Found atom_site loop with {} headers", loop_headers.len()).into());
                let _parsed_rows = loop_rows.len();
                atom_site_rows.extend(loop_rows);
                #[cfg(target_arch = "wasm32")]
                web_sys::console::log_1(&format!("Parsed {} atom_site rows", _parsed_rows).into());
            } else if is_geom_bond_loop(&loop_headers) {
                let loop_rows = parse_loop_rows(&mut lines, &loop_headers)?;
                geom_bond_rows.extend(loop_rows);
            } else {
                skip_loop_rows(&mut lines);
            }
        } else if trimmed.starts_with('_') {
            if let Some((key, value)) = parse_single_value_field(trimmed) {
                fields.insert(key, value);
            }
        }
    }

    let cell = parse_optional_cell_parameters(&fields)?;
    let atoms = parse_atoms(&atom_site_rows, cell)?;
    let bonds = parse_geom_bonds(&geom_bond_rows, &atoms);

    let mut structure = Structure::new(atoms);
    structure.bonds = bonds;
    structure.cell = cell;
    structure.space_group = fields
        .get("_space_group_name_H-M_alt")
        .or_else(|| fields.get("_symmetry_space_group_name_H-M"))
        .map(|value| strip_cif_quotes(value));
    structure.name = Some(data_block);

    Ok(structure)
}

fn parse_single_value_field(line: &str) -> Option<(String, String)> {
    let mut tokens = tokenize_cif_row(line);
    if tokens.len() < 2 {
        return None;
    }

    let key = tokens.remove(0);
    let value = tokens.join(" ");
    Some((key, strip_cif_quotes(&value)))
}

fn skip_loop_rows<'a, I>(lines: &mut std::iter::Peekable<I>)
where
    I: Iterator<Item = &'a str>,
{
    while let Some(data_line) = lines.peek() {
        let data_trimmed = data_line.trim();
        if data_trimmed.starts_with('_')
            || data_trimmed.starts_with("loop_")
            || data_trimmed.starts_with("data_")
        {
            break;
        }
        lines.next();
    }
}

fn parse_loop_rows<'a, I>(
    lines: &mut std::iter::Peekable<I>,
    loop_headers: &[String],
) -> Result<Vec<HashMap<String, String>>, CifError>
where
    I: Iterator<Item = &'a str>,
{
    let mut rows = Vec::new();

    while let Some(data_line) = lines.peek() {
        let data_trimmed = data_line.trim();

        if data_trimmed.starts_with('_')
            || data_trimmed.starts_with("loop_")
            || data_trimmed.starts_with("data_")
        {
            break;
        }

        if data_trimmed.is_empty() || data_trimmed.starts_with('#') {
            lines.next();
            continue;
        }

        let values = tokenize_cif_row(data_trimmed);
        if values.len() < loop_headers.len() {
            return Err(CifError::SyntaxError(format!(
                "Loop row has {} values but expected {}",
                values.len(),
                loop_headers.len()
            )));
        }

        let mut row = HashMap::new();
        for (header, value) in loop_headers.iter().zip(values.iter()) {
            row.insert(header.clone(), strip_cif_quotes(value));
        }
        rows.push(row);
        lines.next();
    }

    Ok(rows)
}

fn tokenize_cif_row(line: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut quote: Option<char> = None;

    for ch in line.chars() {
        match quote {
            Some(active_quote) if ch == active_quote => {
                quote = None;
            }
            Some(_) => current.push(ch),
            None if ch == '\'' || ch == '"' => {
                quote = Some(ch);
            }
            None if ch.is_whitespace() => {
                if !current.is_empty() {
                    tokens.push(std::mem::take(&mut current));
                }
            }
            None => current.push(ch),
        }
    }

    if !current.is_empty() {
        tokens.push(current);
    }

    tokens
}

fn strip_cif_quotes(value: &str) -> String {
    value
        .trim_matches('"')
        .trim_matches('\'')
        .trim()
        .to_string()
}

fn parse_optional_cell_parameters(
    fields: &HashMap<String, String>,
) -> Result<Option<CellParameters>, CifError> {
    let lengths = [
        parse_optional_cell_param(fields, "_cell_length_a")?,
        parse_optional_cell_param(fields, "_cell_length_b")?,
        parse_optional_cell_param(fields, "_cell_length_c")?,
    ];
    let angles = [
        parse_optional_cell_param(fields, "_cell_angle_alpha")?,
        parse_optional_cell_param(fields, "_cell_angle_beta")?,
        parse_optional_cell_param(fields, "_cell_angle_gamma")?,
    ];

    let has_any_lengths = lengths.iter().any(Option::is_some);
    let has_any_angles = angles.iter().any(Option::is_some);

    if !has_any_lengths && !has_any_angles {
        return Ok(None);
    }

    Ok(Some(CellParameters {
        lengths: [
            lengths[0].ok_or_else(|| CifError::MissingField("_cell_length_a".to_string()))?,
            lengths[1].ok_or_else(|| CifError::MissingField("_cell_length_b".to_string()))?,
            lengths[2].ok_or_else(|| CifError::MissingField("_cell_length_c".to_string()))?,
        ],
        angles: [
            angles[0].ok_or_else(|| CifError::MissingField("_cell_angle_alpha".to_string()))?,
            angles[1].ok_or_else(|| CifError::MissingField("_cell_angle_beta".to_string()))?,
            angles[2].ok_or_else(|| CifError::MissingField("_cell_angle_gamma".to_string()))?,
        ],
    }))
}

fn parse_optional_cell_param(
    fields: &HashMap<String, String>,
    key: &str,
) -> Result<Option<f32>, CifError> {
    match fields.get(key) {
        Some(value_str) => {
            let clean_value = value_str.split('(').next().unwrap_or(value_str);
            let value = clean_value.parse::<f32>().map_err(|_| {
                CifError::ParseError(format!("Invalid {} value: {}", key, value_str))
            })?;
            Ok(Some(value))
        }
        None => Ok(None),
    }
}

fn parse_atoms(
    atom_site_rows: &[HashMap<String, String>],
    cell: Option<CellParameters>,
) -> Result<Vec<StructureAtom>, CifError> {
    let mut atoms = Vec::new();

    #[cfg(target_arch = "wasm32")]
    web_sys::console::log_1(&format!("parse_atoms called with {} rows", atom_site_rows.len()).into());

    for (_index, row) in atom_site_rows.iter().enumerate() {
        #[cfg(target_arch = "wasm32")]
        if _index == 0 {
            web_sys::console::log_1(&format!("Row 0 keys: {:?}", row.keys().collect::<Vec<_>>()).into());
        }

        let raw_element = row
            .get("_atom_site_type_symbol")
            .or_else(|| row.get("_atom_site_label"))
            .ok_or_else(|| {
                #[cfg(target_arch = "wasm32")]
                web_sys::console::log_1(
                    &format!(
                        "Row {} missing both _atom_site_type_symbol and _atom_site_label",
                        _index
                    )
                    .into(),
                );
                CifError::MissingField("_atom_site_type_symbol or _atom_site_label".to_string())
            })?;

        let element = clean_element_symbol(raw_element);
        let label = row
            .get("_atom_site_label")
            .cloned()
            .unwrap_or_else(|| element.clone());

        let position = if let (Some(x), Some(y), Some(z)) = (
            row.get("_atom_site_fract_x"),
            row.get("_atom_site_fract_y"),
            row.get("_atom_site_fract_z"),
        ) {
            let cell = cell.ok_or_else(|| {
                CifError::MissingField(
                    "cell parameters required for fractional coordinates".to_string(),
                )
            })?;

            fractional_to_cartesian(
                [
                    parse_float_with_uncertainty(x)?,
                    parse_float_with_uncertainty(y)?,
                    parse_float_with_uncertainty(z)?,
                ],
                cell.lengths,
                cell.angles,
            )
        } else if let (Some(x), Some(y), Some(z)) = (
            row.get("_atom_site_Cartn_x"),
            row.get("_atom_site_Cartn_y"),
            row.get("_atom_site_Cartn_z"),
        ) {
            [
                parse_float_with_uncertainty(x)?,
                parse_float_with_uncertainty(y)?,
                parse_float_with_uncertainty(z)?,
            ]
        } else {
            return Err(CifError::MissingField("atom coordinates".to_string()));
        };

        atoms.push(StructureAtom {
            element,
            label,
            position,
        });
    }

    if atoms.is_empty() {
        return Err(CifError::MissingField("atom_site loop".to_string()));
    }

    Ok(atoms)
}

fn parse_geom_bonds(
    bond_rows: &[HashMap<String, String>],
    atoms: &[StructureAtom],
) -> Vec<StructureBond> {
    if bond_rows.is_empty() {
        return Vec::new();
    }

    let label_to_index: HashMap<&str, usize> = atoms
        .iter()
        .enumerate()
        .map(|(index, atom)| (atom.label.as_str(), index))
        .collect();
    let mut seen = HashSet::new();
    let mut bonds = Vec::new();

    for row in bond_rows {
        let Some(label_a) = row.get("_geom_bond_atom_site_label_1") else {
            continue;
        };
        let Some(label_b) = row.get("_geom_bond_atom_site_label_2") else {
            continue;
        };

        let Some(&atom_a) = label_to_index.get(label_a.as_str()) else {
            continue;
        };
        let Some(&atom_b) = label_to_index.get(label_b.as_str()) else {
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
        if !seen.insert(key) {
            continue;
        }

        bonds.push(StructureBond {
            atom_a: key.0,
            atom_b: key.1,
            order: row.get("_geom_bond_type").and_then(|value| parse_bond_order(value)),
        });
    }

    bonds
}

fn parse_bond_order(value: &str) -> Option<u8> {
    let normalized = value.trim().to_ascii_lowercase();
    match normalized.as_str() {
        "s" | "single" | "sing" => Some(1),
        "d" | "double" => Some(2),
        "t" | "triple" => Some(3),
        _ => normalized.parse::<u8>().ok(),
    }
}

fn is_atom_coordinate_loop(loop_headers: &[String]) -> bool {
    let has_atom_site_header = loop_headers
        .iter()
        .any(|header| header.starts_with("_atom_site_"));
    if !has_atom_site_header {
        return false;
    }

    let has_identity_field = loop_headers
        .iter()
        .any(|header| matches!(header.as_str(), "_atom_site_type_symbol" | "_atom_site_label"));

    let has_fractional_coords = loop_headers.iter().any(|header| header == "_atom_site_fract_x")
        && loop_headers.iter().any(|header| header == "_atom_site_fract_y")
        && loop_headers.iter().any(|header| header == "_atom_site_fract_z");

    let has_cartesian_coords = loop_headers.iter().any(|header| header == "_atom_site_Cartn_x")
        && loop_headers.iter().any(|header| header == "_atom_site_Cartn_y")
        && loop_headers.iter().any(|header| header == "_atom_site_Cartn_z");

    has_identity_field && (has_fractional_coords || has_cartesian_coords)
}

fn is_geom_bond_loop(loop_headers: &[String]) -> bool {
    loop_headers.iter().any(|header| header == "_geom_bond_atom_site_label_1")
        && loop_headers.iter().any(|header| header == "_geom_bond_atom_site_label_2")
}

fn parse_float_with_uncertainty(value: &str) -> Result<f32, CifError> {
    let clean_value = value.split('(').next().unwrap_or(value);
    clean_value.parse::<f32>().map_err(|_| {
        CifError::ParseError(format!("Invalid coordinate value: {}", value))
    })
}

fn clean_element_symbol(symbol: &str) -> String {
    let mut letters = String::new();
    let mut started = false;

    for ch in symbol.chars() {
        if ch.is_ascii_alphabetic() {
            started = true;
            letters.push(ch);
            if letters.len() == 2 {
                break;
            }
        } else if started {
            break;
        }
    }

    if letters.is_empty() {
        String::from("X")
    } else {
        normalize_element_symbol(&letters)
    }
}

fn fractional_to_cartesian(
    fract: [f32; 3],
    cell_lengths: [f32; 3],
    cell_angles: [f32; 3],
) -> [f32; 3] {
    let [a, b, c] = cell_lengths;
    let [alpha, beta, gamma] = cell_angles.map(|deg| deg.to_radians());

    let cos_alpha = alpha.cos();
    let cos_beta = beta.cos();
    let cos_gamma = gamma.cos();
    let sin_gamma = gamma.sin();

    let volume_factor = (1.0 - cos_alpha * cos_alpha - cos_beta * cos_beta - cos_gamma * cos_gamma
        + 2.0 * cos_alpha * cos_beta * cos_gamma)
        .sqrt();

    let x = a * fract[0];
    let y = b * cos_gamma * fract[0] + b * sin_gamma * fract[1];
    let z = c * cos_beta * fract[0]
        + c * (cos_alpha - cos_beta * cos_gamma) / sin_gamma * fract[1]
        + c * volume_factor / sin_gamma * fract[2];

    [x, y, z]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_element_symbol() {
        assert_eq!(clean_element_symbol("Fe2+"), "Fe");
        assert_eq!(clean_element_symbol("Ca1"), "Ca");
        assert_eq!(clean_element_symbol("O_water"), "O");
        assert_eq!(clean_element_symbol("C"), "C");
        assert_eq!(clean_element_symbol("PB1"), "Pb");
    }

    #[test]
    fn test_parse_float_with_uncertainty() {
        assert!((parse_float_with_uncertainty("0.123(4)").unwrap() - 0.123).abs() < 0.001);
        assert!((parse_float_with_uncertainty("5.678").unwrap() - 5.678).abs() < 0.001);
    }

    #[test]
    fn test_fractional_to_cartesian_orthogonal() {
        let cart = fractional_to_cartesian([0.5, 0.5, 0.5], [5.0, 5.0, 5.0], [90.0, 90.0, 90.0]);
        assert!((cart[0] - 2.5).abs() < 0.001);
        assert!((cart[1] - 2.5).abs() < 0.001);
        assert!((cart[2] - 2.5).abs() < 0.001);
    }

    #[test]
    fn test_parse_cif_with_fractional_coordinates() {
        let cif_data = r#"
data_test
_cell_length_a    5.000
_cell_length_b    5.000
_cell_length_c    5.000
_cell_angle_alpha 90.000
_cell_angle_beta  90.000
_cell_angle_gamma 90.000
_symmetry_space_group_name_H-M 'P 1'

loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
C1 C 0.0 0.0 0.0
O1 O 0.5 0.5 0.5
"#;

        let structure = parse_cif(cif_data).unwrap();
        assert_eq!(structure.atoms.len(), 2);
        assert_eq!(structure.atoms[0].element, "C");
        assert_eq!(structure.atoms[1].element, "O");
        assert_eq!(structure.space_group.as_deref(), Some("P 1"));
        assert_eq!(structure.cell.unwrap().lengths, [5.0, 5.0, 5.0]);
        assert!((structure.atoms[1].position[0] - 2.5).abs() < 0.001);
    }

    #[test]
    fn test_parse_cif_with_cartesian_coordinates_without_cell() {
        let cif_data = r#"
data_cart
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_Cartn_x
_atom_site_Cartn_y
_atom_site_Cartn_z
C1 C 0.0 0.0 0.0
O1 O 1.2 0.0 0.0
"#;

        let structure = parse_cif(cif_data).unwrap();
        assert_eq!(structure.atoms.len(), 2);
        assert_eq!(structure.cell, None);
        assert_eq!(structure.atoms[1].position, [1.2, 0.0, 0.0]);
    }

    #[test]
    fn test_ignores_atom_site_aniso_loop() {
        let cif_data = r#"
data_test
_cell_length_a    10.000
_cell_length_b    10.000
_cell_length_c    10.000
_cell_angle_alpha 90.000
_cell_angle_beta  90.000
_cell_angle_gamma 90.000

loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
C1 C 0.0 0.0 0.0
O1 O 0.5 0.5 0.5

loop_
_atom_site_aniso_label
_atom_site_aniso_U_11
_atom_site_aniso_U_22
_atom_site_aniso_U_33
C1 0.012 0.013 0.014
O1 0.021 0.022 0.023
"#;

        let structure = parse_cif(cif_data).unwrap();
        assert_eq!(structure.atoms.len(), 2);
    }

    #[test]
    fn test_parses_geom_bond_loop() {
        let cif_data = r#"
data_test
_cell_length_a    10.000
_cell_length_b    10.000
_cell_length_c    10.000
_cell_angle_alpha 90.000
_cell_angle_beta  90.000
_cell_angle_gamma 90.000

loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
C1 C 0.0 0.0 0.0
O1 O 0.1 0.1 0.1

loop_
_geom_bond_atom_site_label_1
_geom_bond_atom_site_label_2
_geom_bond_distance
_geom_bond_type
C1 O1 1.23 single
"#;

        let structure = parse_cif(cif_data).unwrap();
        assert_eq!(structure.bonds.len(), 1);
        assert_eq!(structure.bonds[0].atom_a, 0);
        assert_eq!(structure.bonds[0].atom_b, 1);
        assert_eq!(structure.bonds[0].order, Some(1));
    }
}

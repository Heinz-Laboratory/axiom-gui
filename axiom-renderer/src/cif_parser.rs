//! CIF (Crystallographic Information File) Parser
//!
//! Parses CIF files following the core CIF 1.1 specification for molecular structures.
//! Supports extraction of atomic positions, elements, and unit cell parameters.

use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct CifStructure {
    /// Unit cell dimensions (a, b, c in Angstroms)
    pub cell_lengths: [f32; 3],
    /// Unit cell angles (alpha, beta, gamma in degrees)
    pub cell_angles: [f32; 3],
    /// Atomic positions and elements
    pub atoms: Vec<Atom>,
    /// Data block name
    pub data_block: String,
}

#[derive(Debug, Clone)]
pub struct Atom {
    /// Element symbol (e.g., "C", "O", "Fe")
    pub element: String,
    /// Atom label from CIF file
    pub label: String,
    /// Cartesian coordinates (x, y, z in Angstroms)
    pub position: [f32; 3],
}

#[derive(Debug)]
pub enum CifError {
    /// Missing required data field
    MissingField(String),
    /// Invalid numeric value
    ParseError(String),
    /// No data block found
    NoDataBlock,
    /// Invalid CIF syntax
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

/// Parse a CIF file from text
pub fn parse_cif(input: &str) -> Result<CifStructure, CifError> {
    let mut lines = input.lines().peekable();
    let mut data_block = String::new();
    let mut fields: HashMap<String, String> = HashMap::new();
    let mut atom_site_data: Vec<HashMap<String, String>> = Vec::new();

    // Find data block
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

    // Parse fields and loops
    while let Some(line) = lines.next() {
        let trimmed = line.trim();

        // Skip empty lines and comments
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        // Handle loop_ constructs
        if trimmed == "loop_" {
            // Parse loop headers
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

            // Check if this is an atom_site loop
            if loop_headers.iter().any(|h| h.contains("atom_site")) {
                #[cfg(target_arch = "wasm32")]
                web_sys::console::log_1(&format!("Found atom_site loop with {} headers", loop_headers.len()).into());

                // Parse data rows
                while let Some(data_line) = lines.peek() {
                    let data_trimmed = data_line.trim();

                    // Stop at next tag or loop
                    if data_trimmed.starts_with('_') || data_trimmed.starts_with("loop_") || data_trimmed.starts_with("data_") {
                        break;
                    }

                    if data_trimmed.is_empty() || data_trimmed.starts_with('#') {
                        lines.next();
                        continue;
                    }

                    // Parse data row
                    let values: Vec<&str> = data_trimmed.split_whitespace().collect();
                    if values.len() >= loop_headers.len() {
                        let mut row: HashMap<String, String> = HashMap::new();
                        for (header, value) in loop_headers.iter().zip(values.iter()) {
                            row.insert(header.clone(), value.to_string());
                        }
                        atom_site_data.push(row);
                    }

                    lines.next();
                }

                #[cfg(target_arch = "wasm32")]
                web_sys::console::log_1(&format!("Parsed {} atom_site rows", atom_site_data.len()).into());
            }
        }
        // Handle single-value fields
        else if trimmed.starts_with('_') {
            if let Some((key, value)) = trimmed.split_once(char::is_whitespace) {
                fields.insert(key.trim().to_string(), value.trim().to_string());
            }
        }
    }

    // Extract cell parameters
    let cell_lengths = [
        parse_cell_param(&fields, "_cell_length_a")?,
        parse_cell_param(&fields, "_cell_length_b")?,
        parse_cell_param(&fields, "_cell_length_c")?,
    ];

    let cell_angles = [
        parse_cell_param(&fields, "_cell_angle_alpha")?,
        parse_cell_param(&fields, "_cell_angle_beta")?,
        parse_cell_param(&fields, "_cell_angle_gamma")?,
    ];

    // Parse atoms
    let atoms = parse_atoms(&atom_site_data, cell_lengths, cell_angles)?;

    Ok(CifStructure {
        cell_lengths,
        cell_angles,
        atoms,
        data_block,
    })
}

/// Parse a cell parameter value, removing uncertainty notation (e.g., "5.123(4)" -> 5.123)
fn parse_cell_param(fields: &HashMap<String, String>, key: &str) -> Result<f32, CifError> {
    let value_str = fields.get(key)
        .ok_or_else(|| CifError::MissingField(key.to_string()))?;

    // Remove uncertainty notation (parentheses)
    let clean_value = value_str.split('(').next().unwrap_or(value_str);

    clean_value.parse::<f32>()
        .map_err(|_| CifError::ParseError(format!("Invalid {} value: {}", key, value_str)))
}

/// Parse atoms from atom_site loop data
fn parse_atoms(
    atom_site_data: &[HashMap<String, String>],
    cell_lengths: [f32; 3],
    cell_angles: [f32; 3],
) -> Result<Vec<Atom>, CifError> {
    let mut atoms = Vec::new();

    #[cfg(target_arch = "wasm32")]
    web_sys::console::log_1(&format!("parse_atoms called with {} rows", atom_site_data.len()).into());

    for (i, row) in atom_site_data.iter().enumerate() {
        #[cfg(target_arch = "wasm32")]
        if i == 0 {
            web_sys::console::log_1(&format!("Row 0 keys: {:?}", row.keys().collect::<Vec<_>>()).into());
        }

        // Extract element symbol
        let element = row.get("_atom_site_type_symbol")
            .or_else(|| row.get("_atom_site_label"))
            .ok_or_else(|| {
                #[cfg(target_arch = "wasm32")]
                web_sys::console::log_1(&format!("Row {} missing both _atom_site_type_symbol and _atom_site_label", i).into());
                CifError::MissingField("_atom_site_type_symbol or _atom_site_label".to_string())
            })?
            .clone();

        // Clean element symbol (remove oxidation states, site labels)
        let element = clean_element_symbol(&element);

        // Extract label
        let label = row.get("_atom_site_label")
            .cloned()
            .unwrap_or_else(|| element.clone());

        // Try fractional coordinates first
        let position = if let (Some(x), Some(y), Some(z)) = (
            row.get("_atom_site_fract_x"),
            row.get("_atom_site_fract_y"),
            row.get("_atom_site_fract_z"),
        ) {
            let fract_x = parse_float_with_uncertainty(x)?;
            let fract_y = parse_float_with_uncertainty(y)?;
            let fract_z = parse_float_with_uncertainty(z)?;

            fractional_to_cartesian([fract_x, fract_y, fract_z], cell_lengths, cell_angles)
        }
        // Fall back to Cartesian coordinates
        else if let (Some(x), Some(y), Some(z)) = (
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

        atoms.push(Atom {
            element,
            label,
            position,
        });
    }

    Ok(atoms)
}

/// Parse float value with uncertainty notation (e.g., "0.123(4)" -> 0.123)
fn parse_float_with_uncertainty(value: &str) -> Result<f32, CifError> {
    let clean_value = value.split('(').next().unwrap_or(value);
    clean_value.parse::<f32>()
        .map_err(|_| CifError::ParseError(format!("Invalid coordinate value: {}", value)))
}

/// Clean element symbol by removing oxidation states and site labels
/// Examples: "Fe2+" -> "Fe", "Ca1" -> "Ca", "O_water" -> "O"
fn clean_element_symbol(symbol: &str) -> String {
    // Take first 1-2 characters that are letters
    let mut result = String::new();
    for (i, ch) in symbol.chars().enumerate() {
        if ch.is_alphabetic() {
            result.push(ch);
            // Element symbols are at most 2 characters, and second char is lowercase
            if i == 1 {
                break;
            }
        } else if !result.is_empty() {
            // Stop at first non-alphabetic after getting letters
            break;
        }
    }
    result
}

/// Convert fractional coordinates to Cartesian coordinates
///
/// Uses the standard crystallographic transformation for orthogonal and non-orthogonal cells.
fn fractional_to_cartesian(
    fract: [f32; 3],
    cell_lengths: [f32; 3],
    cell_angles: [f32; 3],
) -> [f32; 3] {
    let [a, b, c] = cell_lengths;
    let [alpha, beta, gamma] = cell_angles.map(|deg| deg.to_radians());

    // For orthogonal cells (alpha=beta=gamma=90°), this simplifies to scaling
    // For general cells, use full transformation matrix

    let cos_alpha = alpha.cos();
    let cos_beta = beta.cos();
    let cos_gamma = gamma.cos();
    let sin_gamma = gamma.sin();

    // Volume factor for non-orthogonal cells
    let volume_factor = (1.0 - cos_alpha * cos_alpha - cos_beta * cos_beta - cos_gamma * cos_gamma
        + 2.0 * cos_alpha * cos_beta * cos_gamma).sqrt();

    // Transformation matrix (fractional -> Cartesian)
    // x_cart = a * x_fract
    // y_cart = b * cos(gamma) * x_fract + b * sin(gamma) * y_fract
    // z_cart = c * cos(beta) * x_fract + c * (cos(alpha) - cos(beta)*cos(gamma))/sin(gamma) * y_fract + c * volume_factor/sin(gamma) * z_fract

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
        assert_eq!(clean_element_symbol("Pb"), "Pb");
    }

    #[test]
    fn test_parse_float_with_uncertainty() {
        assert!((parse_float_with_uncertainty("0.123(4)").unwrap() - 0.123).abs() < 0.001);
        assert!((parse_float_with_uncertainty("5.678").unwrap() - 5.678).abs() < 0.001);
    }

    #[test]
    fn test_fractional_to_cartesian_cubic() {
        // Cubic cell (a=b=c=5.0, angles=90°)
        let cell_lengths = [5.0, 5.0, 5.0];
        let cell_angles = [90.0, 90.0, 90.0];

        let cart = fractional_to_cartesian([0.5, 0.5, 0.5], cell_lengths, cell_angles);

        // Should be (2.5, 2.5, 2.5)
        assert!((cart[0] - 2.5).abs() < 0.01);
        assert!((cart[1] - 2.5).abs() < 0.01);
        assert!((cart[2] - 2.5).abs() < 0.01);
    }

    #[test]
    fn test_parse_simple_cif() {
        let cif_text = r#"
data_test
_cell_length_a    5.000
_cell_length_b    5.000
_cell_length_c    5.000
_cell_angle_alpha 90.0
_cell_angle_beta  90.0
_cell_angle_gamma 90.0

loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
C1 C 0.0 0.0 0.0
O1 O 0.5 0.5 0.5
"#;

        let structure = parse_cif(cif_text).unwrap();

        assert_eq!(structure.data_block, "test");
        assert_eq!(structure.cell_lengths, [5.0, 5.0, 5.0]);
        assert_eq!(structure.cell_angles, [90.0, 90.0, 90.0]);
        assert_eq!(structure.atoms.len(), 2);

        assert_eq!(structure.atoms[0].element, "C");
        assert_eq!(structure.atoms[1].element, "O");

        // Check positions
        assert!((structure.atoms[0].position[0] - 0.0).abs() < 0.01);
        assert!((structure.atoms[1].position[0] - 2.5).abs() < 0.01);
    }
}

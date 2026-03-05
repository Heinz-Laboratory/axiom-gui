use std::fs;

fn main() {
    let cif_content = fs::read_to_string("/home/agent/messages/downloads/1772692842_282239_ADONAM.PbX_perov_1.cif")
        .expect("Failed to read CIF file");
    
    println!("=== CIF FILE SIZE: {} bytes ===", cif_content.len());
    
    // Try parsing
    match axiom_renderer::cif_parser::parse_cif(&cif_content) {
        Ok(structure) => {
            println!("✅ SUCCESS!");
            println!("Data block: {}", structure.data_block);
            println!("Cell lengths: {:?}", structure.cell_lengths);
            println!("Cell angles: {:?}", structure.cell_angles);
            println!("Number of atoms: {}", structure.atoms.len());
            
            // Print first 5 atoms
            for (i, atom) in structure.atoms.iter().take(5).enumerate() {
                println!("Atom {}: {} ({}) at {:?}", i+1, atom.element, atom.label, atom.position);
            }
        }
        Err(e) => {
            println!("❌ ERROR: {}", e);
            
            // Debug: Look for loop_ and atom_site headers
            let has_loop = cif_content.contains("loop_");
            let has_atom_site_label = cif_content.contains("_atom_site_label");
            let has_atom_site_type = cif_content.contains("_atom_site_type_symbol");
            
            println!("\nDEBUG:");
            println!("  Has 'loop_': {}", has_loop);
            println!("  Has '_atom_site_label': {}", has_atom_site_label);
            println!("  Has '_atom_site_type_symbol': {}", has_atom_site_type);
            
            // Count lines that look like atom data
            let mut atom_lines = 0;
            let mut in_atom_loop = false;
            for line in cif_content.lines() {
                let trimmed = line.trim();
                if trimmed == "loop_" {
                    in_atom_loop = false;
                }
                if trimmed == "_atom_site_label" || trimmed == "_atom_site_type_symbol" {
                    in_atom_loop = true;
                }
                if in_atom_loop && !trimmed.starts_with('_') && !trimmed.is_empty() && !trimmed.starts_with('#') {
                    atom_lines += 1;
                }
            }
            println!("  Lines that look like atom data: {}", atom_lines);
        }
    }
}

/**
 * TypeScript type definitions for CIF (Crystallographic Information File) metadata
 */

/**
 * Cell parameters for crystallographic structures
 * Defines the unit cell dimensions and angles
 */
export interface CellParameters {
  /** Length of a-axis in Ångströms */
  a: number
  /** Length of b-axis in Ångströms */
  b: number
  /** Length of c-axis in Ångströms */
  c: number
  /** Angle alpha in degrees (between b and c axes) */
  alpha: number
  /** Angle beta in degrees (between a and c axes) */
  beta: number
  /** Angle gamma in degrees (between a and b axes) */
  gamma: number
}

/**
 * Metadata extracted from a CIF file
 */
export interface CifMetadata {
  /** Total number of atoms in the structure */
  atom_count: number
  /** Element breakdown as a map (e.g., { "C": 20, "H": 30, "O": 10 }) */
  elements: Record<string, number>
  /** Total number of bonds detected */
  bond_count: number
  /** Unit cell parameters (optional, may not be present in all CIF files) */
  cell_params?: CellParameters
  /** Space group identifier (optional) */
  space_group?: string
  /** Bounding box coordinates [min_x, min_y, min_z, max_x, max_y, max_z] */
  bounds?: [number, number, number, number, number, number]
}

/**
 * Structure data format used by MoleculeViewer
 * This is the simplified format for UI display
 */
export interface StructureData {
  atomCount: number
  elements: string[]
  bondCount: number
  bounds?: number[]
  cellParams?: CellParameters
  spaceGroup?: string
}

/**
 * Converts CifMetadata (from WASM) to StructureData (for React components)
 */
export function cifMetadataToStructureData(metadata: CifMetadata): StructureData {
  return {
    atomCount: metadata.atom_count,
    elements: Object.keys(metadata.elements),
    bondCount: metadata.bond_count,
    bounds: metadata.bounds ? Array.from(metadata.bounds) : undefined,
    cellParams: metadata.cell_params,
    spaceGroup: metadata.space_group,
  }
}

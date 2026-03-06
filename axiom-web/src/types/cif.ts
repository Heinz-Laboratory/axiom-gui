/**
 * TypeScript type definitions for parsed structure metadata returned from WASM.
 */

export interface CellParameters {
  a: number
  b: number
  c: number
  alpha: number
  beta: number
  gamma: number
}

export interface StructureMetadata {
  atom_count: number
  elements: Record<string, number>
  bond_count: number
  cell_params?: CellParameters
  space_group?: string
  bounds?: [number, number, number, number, number, number]
}

// Backwards-compatible alias while the UI migrates off the old name.
export type CifMetadata = StructureMetadata

export interface StructureData {
  atomCount: number
  elements: string[]
  bondCount: number
  bounds?: number[]
  cellParams?: CellParameters
  spaceGroup?: string
  elementCounts?: Record<string, number>
}

export function structureMetadataToStructureData(metadata: StructureMetadata): StructureData {
  return {
    atomCount: metadata.atom_count,
    elements: Object.keys(metadata.elements),
    bondCount: metadata.bond_count,
    bounds: metadata.bounds ? Array.from(metadata.bounds) : undefined,
    cellParams: metadata.cell_params,
    spaceGroup: metadata.space_group,
    elementCounts: metadata.elements,
  }
}

export const SUPPORTED_STRUCTURE_EXTENSIONS = ['.cif', '.mcif', '.pdb', '.ent', '.xyz'] as const
export const SUPPORTED_STRUCTURE_ACCEPT = SUPPORTED_STRUCTURE_EXTENSIONS.join(',')

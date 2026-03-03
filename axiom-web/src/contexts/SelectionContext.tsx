// SelectionContext.tsx - Global state for atom selection and measurements
//
// Manages selected atoms and measurements with React Context API
// for sharing state across components (MoleculeViewer, MeasurementPanel, etc.)

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// Type definitions matching Rust backend
export interface Measurement {
  id: number;
  measurement_type: 'Distance' | 'Angle';
  atom_indices: number[];
  value: number;
  label: string;
}

interface SelectionContextType {
  // Selection state
  selectedAtoms: number[];
  measurementMode: boolean;

  // Selection actions
  selectAtom: (index: number) => void;
  deselectAtom: (index: number) => void;
  clearSelection: () => void;
  toggleAtomSelection: (index: number) => void;
  selectAllAtoms: (maxIndex: number) => void;

  // Measurement mode
  setMeasurementMode: (enabled: boolean) => void;

  // Measurement state
  measurements: Measurement[];

  // Measurement actions
  addMeasurement: (measurement: Measurement) => void;
  removeMeasurement: (id: number) => void;
  clearMeasurements: () => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

interface SelectionProviderProps {
  children: ReactNode;
}

export const SelectionProvider: React.FC<SelectionProviderProps> = ({ children }) => {
  const [selectedAtoms, setSelectedAtoms] = useState<number[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [measurementMode, setMeasurementMode] = useState(false);

  // Select a single atom (replaces current selection)
  const selectAtom = useCallback((index: number) => {
    setSelectedAtoms([index]);
  }, []);

  // Deselect a specific atom
  const deselectAtom = useCallback((index: number) => {
    setSelectedAtoms(prev => prev.filter(i => i !== index));
  }, []);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedAtoms([]);
  }, []);

  // Toggle an atom in the selection (for Ctrl+click multi-select)
  const toggleAtomSelection = useCallback((index: number) => {
    setSelectedAtoms(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index) // Remove if present
        : [...prev, index] // Add if not present
    );
  }, []);

  // Select all atoms (for Ctrl+A)
  const selectAllAtoms = useCallback((maxIndex: number) => {
    setSelectedAtoms(Array.from({ length: maxIndex }, (_, i) => i));
  }, []);

  // Add a measurement from backend
  const addMeasurement = useCallback((measurement: Measurement) => {
    setMeasurements(prev => [...prev, measurement]);
  }, []);

  // Remove a measurement by ID
  const removeMeasurement = useCallback((id: number) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  }, []);

  // Clear all measurements
  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
  }, []);

  const value: SelectionContextType = {
    selectedAtoms,
    measurementMode,
    selectAtom,
    deselectAtom,
    clearSelection,
    toggleAtomSelection,
    selectAllAtoms,
    setMeasurementMode,
    measurements,
    addMeasurement,
    removeMeasurement,
    clearMeasurements,
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
};

// Hook to use the selection context
export const useSelection = (): SelectionContextType => {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within SelectionProvider');
  }
  return context;
};

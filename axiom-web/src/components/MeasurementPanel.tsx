// MeasurementPanel.tsx - UI panel for creating and managing atom measurements
//
// Allows users to create distance (2 atoms) and angle (3 atoms) measurements
// from selected atoms. Displays list of active measurements with delete buttons.

import React, { useState } from 'react';
import { useSelection, type Measurement } from '../contexts/SelectionContext';
import type { WasmRenderer } from '../wasm/axiom-renderer';
import './MeasurementPanel.css';

interface MeasurementPanelProps {
  renderer: WasmRenderer | null;
}

export const MeasurementPanel: React.FC<MeasurementPanelProps> = ({ renderer }) => {
  const {
    measurements,
    selectedAtoms,
    measurementMode,
    setMeasurementMode,
    addMeasurement,
    removeMeasurement,
    clearMeasurements,
  } = useSelection();

  const [newMeasurementType, setNewMeasurementType] = useState<'distance' | 'angle'>('distance');
  const [error, setError] = useState<string | null>(null);

  const handleCreateMeasurement = () => {
    if (!renderer) {
      setError('Renderer not initialized');
      return;
    }

    setError(null);

    try {
      if (newMeasurementType === 'distance' && selectedAtoms.length >= 2) {
        // Create distance measurement
        const id = renderer.create_distance_measurement(selectedAtoms[0], selectedAtoms[1]);
        if (id !== null && id !== undefined) {
          // Fetch the created measurement from backend
          const measurementsJson = renderer.get_measurements();
          const allMeasurements = JSON.parse(measurementsJson) as Measurement[];
          const newMeasurement = allMeasurements.find((m) => m.id === id);
          if (newMeasurement) {
            addMeasurement(newMeasurement);
          }
        }
      } else if (newMeasurementType === 'angle' && selectedAtoms.length >= 3) {
        // Create angle measurement
        const id = renderer.create_angle_measurement(
          selectedAtoms[0],
          selectedAtoms[1],
          selectedAtoms[2]
        );
        if (id !== null && id !== undefined) {
          // Fetch the created measurement from backend
          const measurementsJson = renderer.get_measurements();
          const allMeasurements = JSON.parse(measurementsJson) as Measurement[];
          const newMeasurement = allMeasurements.find((m) => m.id === id);
          if (newMeasurement) {
            addMeasurement(newMeasurement);
          }
        }
      } else {
        setError(
          newMeasurementType === 'distance'
            ? 'Select 2 atoms to measure distance'
            : 'Select 3 atoms to measure angle'
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create measurement');
    }
  };

  const handleDeleteMeasurement = (id: number) => {
    if (!renderer) return;

    try {
      renderer.delete_measurement(id);
      removeMeasurement(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete measurement');
    }
  };

  const handleClearAll = () => {
    if (!renderer) return;

    try {
      // Clear all measurements from backend
      for (const m of measurements) {
        renderer.delete_measurement(m.id);
      }
      clearMeasurements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear measurements');
    }
  };

  return (
    <div className="measurement-panel">
      <div className="panel-header">
        <h3>Measurements</h3>
        {measurements.length > 0 && (
          <button onClick={handleClearAll} className="clear-all-btn" title="Clear all measurements">
            Clear All
          </button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {/* Measurement mode toggle */}
      <div className="measurement-mode-toggle">
        <label>
          <input
            type="checkbox"
            checked={measurementMode}
            onChange={(e) => setMeasurementMode(e.target.checked)}
          />
          <span>Measurement Mode (M)</span>
        </label>
        <p className="help-text">
          {measurementMode ? 'Click atoms to measure' : 'Enable to start measuring'}
        </p>
      </div>

      {/* Measurement list */}
      <div className="measurement-list">
        {measurements.length === 0 ? (
          <p className="empty-state">
            No measurements yet. Select atoms and create a measurement below.
          </p>
        ) : (
          measurements.map((m) => (
            <div key={m.id} className="measurement-item">
              <span className="measurement-icon">
                {m.measurement_type === 'Distance' ? '📏' : '📐'}
              </span>
              <div className="measurement-info">
                <span className="measurement-label">{m.label}</span>
                <span className="measurement-value">
                  {m.measurement_type === 'Distance'
                    ? `${m.value.toFixed(2)} Å`
                    : `${m.value.toFixed(1)}°`}
                </span>
              </div>
              <button
                onClick={() => handleDeleteMeasurement(m.id)}
                className="delete-btn"
                aria-label="Delete measurement"
                title="Delete measurement"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* New measurement section */}
      <div className="new-measurement-section">
        <h4>New Measurement</h4>

        {/* Type selector */}
        <div className="measurement-type-selector">
          <label>
            <input
              type="radio"
              value="distance"
              checked={newMeasurementType === 'distance'}
              onChange={() => setNewMeasurementType('distance')}
            />
            <span>Distance (2 atoms)</span>
          </label>
          <label>
            <input
              type="radio"
              value="angle"
              checked={newMeasurementType === 'angle'}
              onChange={() => setNewMeasurementType('angle')}
            />
            <span>Angle (3 atoms)</span>
          </label>
        </div>

        {/* Selected atoms info */}
        <div className="selected-atoms-info">
          <p>
            <strong>Selected atoms:</strong> {selectedAtoms.length}
          </p>
          {newMeasurementType === 'distance' && selectedAtoms.length < 2 && (
            <p className="help-text">Select 2 atoms to measure distance</p>
          )}
          {newMeasurementType === 'angle' && selectedAtoms.length < 3 && (
            <p className="help-text">Select 3 atoms to measure angle</p>
          )}
          {selectedAtoms.length > 0 && (
            <p className="atom-indices">
              Atoms: {selectedAtoms.slice(0, 3).join(', ')}
              {selectedAtoms.length > 3 && ` +${selectedAtoms.length - 3} more`}
            </p>
          )}
        </div>

        {/* Create button */}
        <button
          onClick={handleCreateMeasurement}
          disabled={
            !renderer ||
            (newMeasurementType === 'distance' && selectedAtoms.length < 2) ||
            (newMeasurementType === 'angle' && selectedAtoms.length < 3)
          }
          className="create-measurement-btn"
        >
          Create Measurement
        </button>
      </div>
    </div>
  );
};

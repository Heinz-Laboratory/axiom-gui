import React, { useState } from 'react'
import { useSelection, type Measurement } from '../contexts/SelectionContext'
import type { WasmRenderer } from '../wasm/axiom-renderer'
import './MeasurementPanel.css'

interface MeasurementPanelProps {
  renderer: WasmRenderer | null
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
  } = useSelection()

  const [newMeasurementType, setNewMeasurementType] = useState<'distance' | 'angle'>('distance')
  const [error, setError] = useState<string | null>(null)

  const handleCreateMeasurement = () => {
    if (!renderer) {
      setError('Renderer not initialized')
      return
    }

    setError(null)

    try {
      if (newMeasurementType === 'distance' && selectedAtoms.length >= 2) {
        const id = renderer.create_distance_measurement(selectedAtoms[0], selectedAtoms[1])
        if (typeof id === 'number' && id >= 0) {
          const measurementsJson = renderer.get_measurements()
          const allMeasurements = JSON.parse(measurementsJson) as Measurement[]
          const newMeasurement = allMeasurements.find((measurement) => measurement.id === id)
          if (newMeasurement) {
            addMeasurement(newMeasurement)
          }
        }
      } else if (newMeasurementType === 'angle' && selectedAtoms.length >= 3) {
        const id = renderer.create_angle_measurement(selectedAtoms[0], selectedAtoms[1], selectedAtoms[2])
        if (typeof id === 'number' && id >= 0) {
          const measurementsJson = renderer.get_measurements()
          const allMeasurements = JSON.parse(measurementsJson) as Measurement[]
          const newMeasurement = allMeasurements.find((measurement) => measurement.id === id)
          if (newMeasurement) {
            addMeasurement(newMeasurement)
          }
        }
      } else {
        setError(
          newMeasurementType === 'distance'
            ? 'Select 2 atoms to measure distance'
            : 'Select 3 atoms to measure angle',
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create measurement')
    }
  }

  const handleDeleteMeasurement = (id: number) => {
    if (!renderer) return

    try {
      renderer.delete_measurement(id)
      removeMeasurement(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete measurement')
    }
  }

  const handleClearAll = () => {
    if (!renderer) return

    try {
      for (const measurement of measurements) {
        renderer.delete_measurement(measurement.id)
      }
      clearMeasurements()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear measurements')
    }
  }

  return (
    <section className="measurement-panel">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">Geometry</span>
          <h3>Measurements</h3>
        </div>
        {measurements.length > 0 && (
          <button onClick={handleClearAll} className="clear-all-btn" title="Clear all measurements">
            Clear All
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

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
          {measurementMode ? 'Click atoms in the viewport to build a selection.' : 'Enable measurement mode to start picking atoms.'}
        </p>
      </div>

      <div className="new-measurement-section">
        <h4>New measurement</h4>
        <div className="measurement-type-selector">
          <label className={newMeasurementType === 'distance' ? 'is-active' : ''}>
            <input
              type="radio"
              value="distance"
              checked={newMeasurementType === 'distance'}
              onChange={() => setNewMeasurementType('distance')}
            />
            <span>Distance (2 atoms)</span>
          </label>
          <label className={newMeasurementType === 'angle' ? 'is-active' : ''}>
            <input
              type="radio"
              value="angle"
              checked={newMeasurementType === 'angle'}
              onChange={() => setNewMeasurementType('angle')}
            />
            <span>Angle (3 atoms)</span>
          </label>
        </div>

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

        <button
          onClick={handleCreateMeasurement}
          disabled={
            !renderer
            || (newMeasurementType === 'distance' && selectedAtoms.length < 2)
            || (newMeasurementType === 'angle' && selectedAtoms.length < 3)
          }
          className="create-measurement-btn"
        >
          Create Measurement
        </button>
      </div>

      <div className="measurement-list">
        {measurements.length === 0 ? (
          <p className="empty-state">
            No measurements yet. Select atoms and create a measurement below.
          </p>
        ) : (
          measurements.map((measurement) => (
            <div key={measurement.id} className="measurement-item">
              <div className="measurement-info">
                <span className="measurement-label">{measurement.label}</span>
                <span className="measurement-value">
                  {measurement.measurement_type === 'Distance'
                    ? `${measurement.value.toFixed(2)} Å`
                    : `${measurement.value.toFixed(1)}°`}
                </span>
              </div>
              <button
                onClick={() => handleDeleteMeasurement(measurement.id)}
                className="delete-btn"
                aria-label="Delete measurement"
                title="Delete measurement"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

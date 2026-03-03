import './CameraControlsPanel.css'

interface CameraControlsProps {
  onReset: () => void
  onFitToView: () => void
}

export function CameraControlsPanel({
  onReset,
  onFitToView,
}: CameraControlsProps) {
  return (
    <div className="camera-controls-panel">
      <h3>Camera Controls</h3>

      <div className="control-hint">
        <p>Use mouse to control camera:</p>
        <ul>
          <li><strong>Drag</strong> - Rotate view</li>
          <li><strong>Scroll</strong> - Zoom in/out</li>
        </ul>
      </div>

      {/* Action buttons */}
      <div className="action-buttons">
        <button className="control-btn fit-btn" onClick={onFitToView} title="Center and fit structure to view">
          🎯 Fit to View
        </button>
        <button className="control-btn reset-btn" onClick={onReset} title="Reset camera to default position">
          🔄 Reset
        </button>
      </div>
    </div>
  )
}

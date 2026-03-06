import './CameraControlsPanel.css'

interface CameraControlsProps {
  onReset: () => void
  onFitToView: () => void
}

export function CameraControlsPanel({ onReset, onFitToView }: CameraControlsProps) {
  return (
    <section className="camera-controls-panel">
      <div className="panel-header">
        <div>
          <span className="panel-eyebrow">Navigation</span>
          <h3>Camera controls</h3>
        </div>
      </div>

      <div className="control-hint">
        <div className="control-hint__item">
          <strong>Rotate</strong>
          <span>Left drag on the viewport</span>
        </div>
        <div className="control-hint__item">
          <strong>Pan</strong>
          <span>Right or middle drag</span>
        </div>
        <div className="control-hint__item">
          <strong>Zoom</strong>
          <span>Mouse wheel or trackpad scroll</span>
        </div>
      </div>

      <div className="action-buttons">
        <button className="control-btn fit-btn" onClick={onFitToView} title="Center and fit structure to view">
          Fit to View
        </button>
        <button className="control-btn reset-btn" onClick={onReset} title="Reset camera to default position">
          Reset
        </button>
      </div>
    </section>
  )
}

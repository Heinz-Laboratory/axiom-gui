import { useState } from 'react';
import type { WasmRenderer } from '../wasm/axiom-renderer';
import '../styles/ExportPanel.css';

interface ExportPanelProps {
  renderer: WasmRenderer | null;
  structureName: string;
}

type ExportType = 'png' | 'structure' | 'scene';
type Resolution = '1080p' | '4k' | '8k' | 'custom';
type StructureFormat = 'pdb' | 'xyz' | 'cif';

const RESOLUTIONS = {
  '1080p': { width: 1920, height: 1080, label: '1080p (1920×1080)' },
  '4k': { width: 3840, height: 2160, label: '4K (3840×2160)' },
  '8k': { width: 7680, height: 4320, label: '8K (7680×4320)' },
  'custom': { width: 1920, height: 1080, label: 'Custom' },
};

export function ExportPanel({ renderer, structureName }: ExportPanelProps) {
  const [exportType, setExportType] = useState<ExportType>('png');
  const [resolution, setResolution] = useState<Resolution>('1080p');
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [structureFormat, setStructureFormat] = useState<StructureFormat>('pdb');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string>('');

  const handleExportPNG = async () => {
    if (!renderer) return;

    setIsExporting(true);
    setError('');

    try {
      // Get resolution
      const res = resolution === 'custom'
        ? { width: customWidth, height: customHeight }
        : RESOLUTIONS[resolution];

      // Get the canvas element
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        throw new Error('Canvas not found');
      }

      // Create a temporary canvas for high-resolution rendering
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = res.width;
      tempCanvas.height = res.height;
      const ctx = tempCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Copy current frame to temp canvas (scaled up)
      ctx.drawImage(canvas, 0, 0, res.width, res.height);

      // Export as PNG
      tempCanvas.toBlob((blob) => {
        if (!blob) {
          setError('Failed to create image');
          setIsExporting(false);
          return;
        }

        // Download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${structureName || 'molecule'}_${res.width}x${res.height}.png`;
        a.click();
        URL.revokeObjectURL(url);

        setIsExporting(false);
      }, 'image/png');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setIsExporting(false);
    }
  };

  const handleExportStructure = () => {
    if (!renderer) return;

    setIsExporting(true);
    setError('');

    try {
      let content: string;
      let extension: string;

      // Call appropriate export method
      switch (structureFormat) {
        case 'pdb':
          content = renderer.export_pdb(structureName || 'molecule');
          extension = 'pdb';
          break;
        case 'xyz':
          content = renderer.export_xyz(structureName || 'molecule');
          extension = 'xyz';
          break;
        case 'cif':
          content = renderer.export_cif(structureName || 'molecule');
          extension = 'cif';
          break;
      }

      // Download as text file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${structureName || 'molecule'}.${extension}`;
      a.click();
      URL.revokeObjectURL(url);

      setIsExporting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setIsExporting(false);
    }
  };

  const handleExportScene = () => {
    if (!renderer) return;

    setIsExporting(true);
    setError('');

    try {
      // Get camera state from renderer
      const cameraState = renderer.get_camera_state();

      // Create scene data
      const sceneData = {
        version: '0.3.0',
        timestamp: new Date().toISOString(),
        structureName: structureName || 'molecule',
        cameraState: JSON.parse(cameraState),
        renderSettings: {
          // TODO: Add render settings when implemented
        },
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(sceneData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${structureName || 'molecule'}_scene.json`;
      a.click();
      URL.revokeObjectURL(url);

      setIsExporting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
      setIsExporting(false);
    }
  };

  const handleLoadScene = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !renderer) return;

      try {
        const text = await file.text();
        const sceneData = JSON.parse(text);

        // Restore camera state
        if (sceneData.cameraState) {
          const cam = sceneData.cameraState;
          if (cam.eye && cam.target) {
            renderer.set_camera_position(
              cam.eye[0], cam.eye[1], cam.eye[2],
              cam.target[0], cam.target[1], cam.target[2]
            );
          }
        }

        // TODO: Restore render settings when implemented

        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load scene');
      }
    };
    input.click();
  };

  const isDisabled = !renderer || isExporting;

  return (
    <div className="export-panel">
      <h3>Export</h3>

      {/* Export type tabs */}
      <div className="export-tabs">
        <button
          className={exportType === 'png' ? 'active' : ''}
          onClick={() => setExportType('png')}
        >
          PNG Image
        </button>
        <button
          className={exportType === 'structure' ? 'active' : ''}
          onClick={() => setExportType('structure')}
        >
          Structure File
        </button>
        <button
          className={exportType === 'scene' ? 'active' : ''}
          onClick={() => setExportType('scene')}
        >
          Scene
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="export-error">{error}</div>
      )}

      {/* PNG export options */}
      {exportType === 'png' && (
        <div className="export-options">
          <div className="form-group">
            <label>Resolution</label>
            <select value={resolution} onChange={(e) => setResolution(e.target.value as Resolution)}>
              {Object.entries(RESOLUTIONS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {resolution === 'custom' && (
            <div className="custom-resolution">
              <div className="form-group">
                <label>Width (px)</label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Number(e.target.value))}
                  min={640}
                  max={15360}
                />
              </div>
              <div className="form-group">
                <label>Height (px)</label>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Number(e.target.value))}
                  min={480}
                  max={8640}
                />
              </div>
            </div>
          )}

          <button
            className="export-button primary"
            onClick={handleExportPNG}
            disabled={isDisabled}
          >
            {isExporting ? 'Exporting...' : 'Export PNG'}
          </button>
        </div>
      )}

      {/* Structure export options */}
      {exportType === 'structure' && (
        <div className="export-options">
          <div className="form-group">
            <label>Format</label>
            <select value={structureFormat} onChange={(e) => setStructureFormat(e.target.value as StructureFormat)}>
              <option value="pdb">PDB (.pdb)</option>
              <option value="xyz">XYZ (.xyz)</option>
              <option value="cif">CIF (.cif)</option>
            </select>
          </div>

          <div className="format-info">
            {structureFormat === 'pdb' && (
              <p>Protein Data Bank format with ATOM records and fixed-width columns.</p>
            )}
            {structureFormat === 'xyz' && (
              <p>Simple Cartesian coordinates format (element symbol + X Y Z).</p>
            )}
            {structureFormat === 'cif' && (
              <p>Crystallographic Information File with fractional coordinates.</p>
            )}
          </div>

          <button
            className="export-button primary"
            onClick={handleExportStructure}
            disabled={isDisabled}
          >
            Export {structureFormat.toUpperCase()}
          </button>
        </div>
      )}

      {/* Scene export options */}
      {exportType === 'scene' && (
        <div className="export-options">
          <p className="scene-description">
            Save or load the current view state, including camera position and render settings.
          </p>

          <div className="scene-buttons">
            <button
              className="export-button primary"
              onClick={handleExportScene}
              disabled={isDisabled}
            >
              Export Scene JSON
            </button>
            <button
              className="export-button secondary"
              onClick={handleLoadScene}
              disabled={isDisabled}
            >
              Load Scene JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

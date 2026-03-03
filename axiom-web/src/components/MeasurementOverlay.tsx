// MeasurementOverlay.tsx - SVG overlay for visualizing measurements on canvas
//
// Projects 3D atom positions to 2D screen space and draws measurement lines
// Distance measurements: yellow straight lines between 2 atoms
// Angle measurements: green lines forming angle with arc

import React, { useEffect, useState } from 'react';
import { useSelection, type Measurement } from '../contexts/SelectionContext';
import type { WasmRenderer } from '../wasm/axiom-renderer';
import './MeasurementOverlay.css';

interface Point2D {
  x: number;
  y: number;
}

interface OverlayData {
  measurement: Measurement;
  positions: Point2D[];
}

interface MeasurementOverlayProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  renderer: WasmRenderer | null;
}

export const MeasurementOverlay: React.FC<MeasurementOverlayProps> = ({
  canvasRef,
  renderer,
}) => {
  const { measurements } = useSelection();
  const [overlayData, setOverlayData] = useState<OverlayData[]>([]);

  useEffect(() => {
    if (!canvasRef.current || !renderer) return;

    const updateOverlay = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Project 3D atom positions to 2D screen coordinates
      // Note: This requires renderer.get_atom() and renderer.project_to_screen() methods
      // For now, we'll use placeholder implementation
      const newOverlayData = measurements.map((m) => {
        try {
          // Get atom positions from renderer (placeholder - actual implementation needed)
          // const positions = m.atom_indices.map(idx => {
          //   const atom = renderer.get_atom(idx);
          //   if (!atom) return null;
          //   const screen = renderer.project_to_screen(atom.position);
          //   return {
          //     x: screen.x * rect.width,
          //     y: screen.y * rect.height,
          //   };
          // }).filter(p => p !== null);

          // For now, return placeholder data (will be implemented when backend methods are available)
          const positions: Point2D[] = [];

          return {
            measurement: m,
            positions,
          };
        } catch (err) {
          console.error('Error projecting measurement:', err);
          return {
            measurement: m,
            positions: [],
          };
        }
      });

      setOverlayData(newOverlayData);
    };

    // Initial update
    updateOverlay();

    // Update overlay on camera movement (10 FPS)
    const interval = setInterval(updateOverlay, 100);
    return () => clearInterval(interval);
  }, [measurements, canvasRef, renderer]);

  return (
    <svg
      className="measurement-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {overlayData.map(({ measurement, positions }) => {
        // Distance measurement (2 atoms)
        if (measurement.measurement_type === 'Distance' && positions.length === 2) {
          const [p1, p2] = positions;
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;

          return (
            <g key={measurement.id}>
              {/* Line connecting atoms */}
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#FFD700"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
              {/* Endpoint markers */}
              <circle cx={p1.x} cy={p1.y} r={4} fill="#FFD700" />
              <circle cx={p2.x} cy={p2.y} r={4} fill="#FFD700" />
              {/* Label with value */}
              <text
                x={midX}
                y={midY - 10}
                fill="#FFD700"
                fontSize="14"
                fontWeight="bold"
                textAnchor="middle"
                style={{ textShadow: '0 0 4px black' }}
              >
                {measurement.value.toFixed(2)} Å
              </text>
            </g>
          );
        }

        // Angle measurement (3 atoms)
        if (measurement.measurement_type === 'Angle' && positions.length === 3) {
          const [p1, p2, p3] = positions;

          return (
            <g key={measurement.id}>
              {/* Lines forming angle */}
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#4CAF50" strokeWidth={2} />
              <line x1={p2.x} y1={p2.y} x2={p3.x} y2={p3.y} stroke="#4CAF50" strokeWidth={2} />
              {/* Endpoint markers */}
              <circle cx={p1.x} cy={p1.y} r={4} fill="#4CAF50" />
              <circle cx={p2.x} cy={p2.y} r={4} fill="#4CAF50" />
              <circle cx={p3.x} cy={p3.y} r={4} fill="#4CAF50" />
              {/* Angle arc (simplified - could use path for arc) */}
              <text
                x={p2.x + 15}
                y={p2.y - 10}
                fill="#4CAF50"
                fontSize="14"
                fontWeight="bold"
                style={{ textShadow: '0 0 4px black' }}
              >
                {measurement.value.toFixed(1)}°
              </text>
            </g>
          );
        }

        return null;
      })}
    </svg>
  );
};

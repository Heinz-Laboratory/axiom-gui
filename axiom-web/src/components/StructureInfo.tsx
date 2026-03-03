import type { CellParameters } from '../types/cif'

interface StructureData {
  atomCount: number
  elements: string[]
  bondCount: number
  bounds?: number[]
  cellParams?: CellParameters
  spaceGroup?: string
  elementCounts?: Record<string, number>
}

interface StructureInfoProps {
  data: StructureData | null
  filename?: string
}

export function StructureInfo({ data, filename }: StructureInfoProps) {
  if (!data) {
    return (
      <div style={{
        padding: '20px',
        background: '#2a2a2a',
        borderRadius: '8px',
        color: '#888',
        fontSize: '13px',
        fontFamily: 'monospace',
        textAlign: 'center',
      }}>
        No structure loaded
      </div>
    )
  }

  return (
    <div style={{
      padding: '20px',
      background: '#2a2a2a',
      borderRadius: '8px',
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#ddd',
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#4CAF50' }}>
        Structure Information
      </div>

      {filename && (
        <div style={{ marginBottom: '10px', color: '#aaa', wordBreak: 'break-word' }}>
          <span style={{ color: '#888' }}>File:</span> {filename}
        </div>
      )}

      <div style={{ marginBottom: '8px' }}>
        <span style={{ color: '#888' }}>Atoms:</span> {data.atomCount.toLocaleString()}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <span style={{ color: '#888' }}>Bonds:</span> {data.bondCount.toLocaleString()}
      </div>

      {/* Element breakdown */}
      {data.elementCounts ? (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #444' }}>
          <div style={{ color: '#888', marginBottom: '8px', fontWeight: 'bold' }}>Element Breakdown:</div>
          <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
            {Object.entries(data.elementCounts)
              .sort((a, b) => b[1] - a[1]) // Sort by count descending
              .map(([element, count]) => (
                <div key={element} style={{ marginBottom: '4px' }}>
                  <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{element}:</span>{' '}
                  <span style={{ color: '#ddd' }}>{count.toLocaleString()}</span>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#888' }}>Elements:</span>{' '}
          {data.elements.join(', ')}
        </div>
      )}

      {/* Cell parameters */}
      {data.cellParams && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #444' }}>
          <div style={{ color: '#888', marginBottom: '8px', fontWeight: 'bold' }}>Unit Cell:</div>
          <div style={{ fontSize: '11px', color: '#aaa', lineHeight: '1.6' }}>
            <div>a = {data.cellParams.a.toFixed(3)} Å</div>
            <div>b = {data.cellParams.b.toFixed(3)} Å</div>
            <div>c = {data.cellParams.c.toFixed(3)} Å</div>
            <div style={{ marginTop: '4px' }}>
              α = {data.cellParams.alpha.toFixed(1)}°
            </div>
            <div>β = {data.cellParams.beta.toFixed(1)}°</div>
            <div>γ = {data.cellParams.gamma.toFixed(1)}°</div>
          </div>
        </div>
      )}

      {/* Space group */}
      {data.spaceGroup && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #444' }}>
          <div style={{ color: '#888', marginBottom: '4px' }}>Space Group:</div>
          <div style={{ fontSize: '12px', color: '#ddd', fontWeight: 'bold' }}>
            {data.spaceGroup}
          </div>
        </div>
      )}

      {/* Bounding box */}
      {data.bounds && data.bounds.length === 6 && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #444' }}>
          <div style={{ color: '#888', marginBottom: '6px' }}>Bounding Box (Å):</div>
          <div style={{ fontSize: '11px', color: '#aaa', lineHeight: '1.5' }}>
            X: {data.bounds[0].toFixed(2)} → {data.bounds[3].toFixed(2)}<br />
            Y: {data.bounds[1].toFixed(2)} → {data.bounds[4].toFixed(2)}<br />
            Z: {data.bounds[2].toFixed(2)} → {data.bounds[5].toFixed(2)}
          </div>
        </div>
      )}
    </div>
  )
}

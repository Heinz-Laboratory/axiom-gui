import { useState } from 'react'

interface SampleFile {
  name: string
  path: string
  description: string
}

interface SampleFileDropdownProps {
  onLoadSample: (path: string, name: string) => void
}

const SAMPLE_FILES: SampleFile[] = [
  {
    name: 'Water (H₂O)',
    path: '/samples/water.cif',
    description: 'Simple water molecule - 3 atoms'
  },
  {
    name: 'Benzene (C₆H₆)',
    path: '/samples/benzene.cif',
    description: 'Benzene ring - 12 atoms'
  },
  {
    name: 'Simple Cubic',
    path: '/samples/simple-cubic.cif',
    description: 'Cubic carbon lattice - 8 atoms'
  },
  {
    name: 'Quartz (SiO₂)',
    path: '/samples/quartz.cif',
    description: 'Crystal structure with cell parameters - 9 atoms'
  },
]

export function SampleFileDropdown({ onLoadSample }: SampleFileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSelectSample(sample: SampleFile) {
    setIsOpen(false)
    setIsLoading(true)

    try {
      const response = await fetch(sample.path)
      if (!response.ok) {
        throw new Error(`Failed to load ${sample.name}`)
      }
      const content = await response.text()
      onLoadSample(content, sample.name)
    } catch (err) {
      console.error('Failed to load sample:', err)
      alert(`Failed to load sample file: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      padding: '20px',
      background: '#2a2a2a',
      borderRadius: '8px',
      marginBottom: '20px',
      position: 'relative',
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: 'bold',
        marginBottom: '10px',
        color: '#ddd',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        Sample Structures
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: isLoading ? '#555' : '#333',
          color: isLoading ? '#888' : '#ddd',
          border: '1px solid #555',
          borderRadius: '4px',
          fontSize: '13px',
          fontWeight: '400',
          cursor: isLoading ? 'wait' : 'pointer',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          transition: 'all 0.2s',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        onMouseEnter={(e) => {
          if (!isLoading) e.currentTarget.style.background = '#3a3a3a'
        }}
        onMouseLeave={(e) => {
          if (!isLoading) e.currentTarget.style.background = '#333'
        }}
      >
        <span>{isLoading ? 'Loading...' : 'Load example structure'}</span>
        <span style={{ fontSize: '10px' }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && !isLoading && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '20px',
          right: '20px',
          marginTop: '4px',
          background: '#1a1a1a',
          border: '1px solid #555',
          borderRadius: '4px',
          zIndex: 1000,
          maxHeight: '300px',
          overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        }}>
          {SAMPLE_FILES.map((sample) => (
            <div
              key={sample.path}
              onClick={() => handleSelectSample(sample)}
              style={{
                padding: '12px',
                cursor: 'pointer',
                borderBottom: '1px solid #333',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                fontSize: '13px',
                fontWeight: '500',
                color: '#4CAF50',
                marginBottom: '4px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}>
                {sample.name}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#888',
                fontFamily: 'monospace',
              }}>
                {sample.description}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

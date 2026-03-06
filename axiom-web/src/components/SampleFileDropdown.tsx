import { useMemo, useState } from 'react'

interface SampleFile {
  name: string
  path: string
  description: string
  category: string
}

interface SampleFileDropdownProps {
  onLoadSample: (content: string, displayName: string, sourcePath: string) => void
}

const SAMPLE_FILES: SampleFile[] = [
  {
    name: 'Water (CIF)',
    path: '/samples/water.cif',
    description: 'Crystallographic sanity check · 3 atoms',
    category: 'Crystal',
  },
  {
    name: 'Water (XYZ)',
    path: '/samples/water.xyz',
    description: 'Coordinate-only reference · 3 atoms',
    category: 'Coordinate',
  },
  {
    name: 'Benzene (C₆H₆)',
    path: '/samples/benzene.cif',
    description: 'Aromatic ring reference · 12 atoms',
    category: 'Organic',
  },
  {
    name: 'Ethanol (XYZ)',
    path: '/samples/ethanol.xyz',
    description: 'Small-molecule XYZ with inferred bonds · 9 atoms',
    category: 'Coordinate',
  },
  {
    name: 'Quartz (SiO₂)',
    path: '/samples/quartz.cif',
    description: 'Unit-cell-aware crystal example · 9 atoms',
    category: 'Crystal',
  },
  {
    name: 'Crambin (1CRN PDB)',
    path: '/samples/1crn.pdb',
    description: 'Protein reference from RCSB · 327 atoms',
    category: 'Protein',
  },
]

function getFormatLabel(path: string): string {
  return path.split('.').pop()?.toUpperCase() ?? 'FILE'
}

export function SampleFileDropdown({ onLoadSample }: SampleFileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const groupedSamples = useMemo(() => SAMPLE_FILES, [])

  async function handleSelectSample(sample: SampleFile) {
    setIsOpen(false)
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(sample.path)
      if (!response.ok) {
        throw new Error(`Failed to load ${sample.name}`)
      }
      const content = await response.text()
      onLoadSample(content, sample.name, sample.path)
    } catch (err) {
      console.error('Failed to load sample:', err)
      setError(`Failed to load sample file: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="axiom-card sample-library" data-testid="sample-library">
      <div className="section-heading">
        <span className="section-heading__eyebrow">Reference structures</span>
        <h2>Load a vetted sample</h2>
      </div>

      <p className="section-copy">
        Use known-good examples to verify parsing, camera behavior, and rendering before moving into live lab files.
      </p>

      <button
        type="button"
        className="sample-library__toggle"
        onClick={() => setIsOpen((current) => !current)}
        disabled={isLoading}
        aria-expanded={isOpen}
      >
        <span>{isLoading ? 'Loading...' : 'Load example structure'}</span>
        <span className="sample-library__toggle-icon">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && !isLoading && (
        <div className="sample-library__grid" role="listbox" aria-label="Example structures">
          {groupedSamples.map((sample) => (
            <button
              key={sample.path}
              type="button"
              className="sample-library__item"
              onClick={() => handleSelectSample(sample)}
            >
              <span className="sample-library__item-head">
                <span className="sample-library__name">{sample.name}</span>
                <span className="sample-library__badges">
                  <span className="sample-library__category">{sample.category}</span>
                  <span className="sample-library__format">{getFormatLabel(sample.path)}</span>
                </span>
              </span>
              <span className="sample-library__description">{sample.description}</span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="status-banner status-banner--error" role="alert">
          {error}
        </div>
      )}
    </section>
  )
}

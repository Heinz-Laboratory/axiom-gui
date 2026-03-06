import { useMemo, useState } from 'react'

interface SampleFile {
  name: string
  path: string
  description: string
}

interface SampleFileDropdownProps {
  onLoadSample: (content: string, displayName: string, sourcePath: string) => void
}

const SAMPLE_FILES: SampleFile[] = [
  {
    name: 'Water (CIF)',
    path: '/samples/water.cif',
    description: 'Crystallographic water reference · 3 atoms',
  },
  {
    name: 'Water (XYZ)',
    path: '/samples/water.xyz',
    description: 'Minimal coordinate-only structure · 3 atoms',
  },
  {
    name: 'Benzene (C₆H₆)',
    path: '/samples/benzene.cif',
    description: 'Aromatic ring sanity check · 12 atoms',
  },
  {
    name: 'Ethanol (XYZ)',
    path: '/samples/ethanol.xyz',
    description: 'Small organic molecule with inferred bonds · 9 atoms',
  },
  {
    name: 'Quartz (SiO₂)',
    path: '/samples/quartz.cif',
    description: 'Cell-aware crystal structure · 9 atoms',
  },
  {
    name: 'Crambin (1CRN PDB)',
    path: '/samples/1crn.pdb',
    description: 'Protein example from RCSB · 327 atoms',
  },
]

function getFormatLabel(path: string): string {
  const extension = path.split('.').pop()?.toUpperCase()
  return extension ?? 'FILE'
}

export function SampleFileDropdown({ onLoadSample }: SampleFileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const groupedSamples = useMemo(() => SAMPLE_FILES, [])

  async function handleSelectSample(sample: SampleFile) {
    setIsOpen(false)
    setIsLoading(true)

    try {
      const response = await fetch(sample.path)
      if (!response.ok) {
        throw new Error(`Failed to load ${sample.name}`)
      }
      const content = await response.text()
      onLoadSample(content, sample.name, sample.path)
    } catch (err) {
      console.error('Failed to load sample:', err)
      alert(`Failed to load sample file: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="axiom-card sample-library" data-testid="sample-library">
      <div className="section-heading">
        <span className="section-heading__eyebrow">Reference Set</span>
        <h2>Load a vetted sample</h2>
      </div>

      <p className="section-copy">
        Use known-good structures to validate parsing, camera behavior, and render-mode changes before loading live data.
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
                <span className="sample-library__format">{getFormatLabel(sample.path)}</span>
              </span>
              <span className="sample-library__description">{sample.description}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

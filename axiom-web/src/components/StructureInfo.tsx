import type { StructureData } from '../types/cif'

interface StructureInfoProps {
  data: StructureData | null
  filename?: string
}

function formatRange(min: number, max: number) {
  return `${min.toFixed(2)} to ${max.toFixed(2)}`
}

export function StructureInfo({ data, filename }: StructureInfoProps) {
  if (!data) {
    return (
      <section className="axiom-card structure-panel structure-panel--empty" data-testid="structure-info">
        <div className="section-heading">
          <span className="section-heading__eyebrow">Scene intel</span>
          <h2>Structure summary</h2>
        </div>
        <p className="section-copy">
          No structure loaded. Once parsing completes, Axiom surfaces atom counts, bond counts, cell data, and scene bounds here.
        </p>
      </section>
    )
  }

  const sortedElements = data.elementCounts
    ? Object.entries(data.elementCounts).sort((a, b) => b[1] - a[1])
    : data.elements.map((element) => [element, 0] as const)

  return (
    <section className="axiom-card structure-panel" data-testid="structure-info">
      <div className="section-heading">
        <span className="section-heading__eyebrow">Scene intel</span>
        <h2>Structure summary</h2>
      </div>

      {filename && (
        <div className="structure-panel__filename">
          <span className="structure-panel__label">File:</span>
          <strong>{filename}</strong>
        </div>
      )}

      <div className="structure-panel__stats">
        <div className="structure-panel__stat-card">
          <span className="structure-panel__label">Atoms</span>
          <strong>{data.atomCount.toLocaleString()}</strong>
        </div>
        <div className="structure-panel__stat-card">
          <span className="structure-panel__label">Bonds</span>
          <strong>{data.bondCount.toLocaleString()}</strong>
        </div>
        <div className="structure-panel__stat-card">
          <span className="structure-panel__label">Elements</span>
          <strong>{sortedElements.length.toLocaleString()}</strong>
        </div>
      </div>

      <div className="structure-panel__section">
        <div className="structure-panel__section-title">Element breakdown</div>
        <div className="structure-panel__element-grid">
          {sortedElements.map(([element, count]) => (
            <div key={element} className="structure-panel__element-chip">
              <span>{element}</span>
              <strong>{count.toLocaleString()}</strong>
            </div>
          ))}
        </div>
      </div>

      {data.cellParams && (
        <div className="structure-panel__section">
          <div className="structure-panel__section-title">Unit cell</div>
          <div className="structure-panel__kv-grid">
            <span>a = {data.cellParams.a.toFixed(3)} Å</span>
            <span>b = {data.cellParams.b.toFixed(3)} Å</span>
            <span>c = {data.cellParams.c.toFixed(3)} Å</span>
            <span>α = {data.cellParams.alpha.toFixed(1)}°</span>
            <span>β = {data.cellParams.beta.toFixed(1)}°</span>
            <span>γ = {data.cellParams.gamma.toFixed(1)}°</span>
          </div>
        </div>
      )}

      {(data.spaceGroup || data.bounds) && (
        <div className="structure-panel__section">
          <div className="structure-panel__section-title">Scene envelope</div>

          {data.spaceGroup && (
            <div className="structure-panel__line-item">
              <span className="structure-panel__label">Space Group:</span>
              <strong>{data.spaceGroup}</strong>
            </div>
          )}

          {data.bounds && data.bounds.length === 6 && (
            <div className="structure-panel__bounds">
              <span>X: {formatRange(data.bounds[0], data.bounds[3])}</span>
              <span>Y: {formatRange(data.bounds[1], data.bounds[4])}</span>
              <span>Z: {formatRange(data.bounds[2], data.bounds[5])}</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

import { useRef, useState } from 'react'
import { SUPPORTED_STRUCTURE_ACCEPT } from '../types/cif'

interface FileUploadProps {
  onFileLoad: (content: string, filename: string) => void
  accept?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024

export function FileUpload({ onFileLoad, accept = SUPPORTED_STRUCTURE_ACCEPT }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function validateAndReadFile(file: File) {
    setError(null)

    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`
    const acceptedExtensions = accept.split(',').map((value) => value.trim().toLowerCase())
    if (!acceptedExtensions.includes(extension)) {
      setError(`Invalid file type. Expected ${accept}`)
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`Warning: Large file (${(file.size / 1024 / 1024).toFixed(1)} MB). Parsing may take longer.`)
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        onFileLoad(content, file.name)
      } else {
        setError('Failed to read file')
      }
    }
    reader.onerror = () => {
      setError('Failed to read file')
    }
    reader.readAsText(file)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    validateAndReadFile(file)
    e.target.value = ''
  }

  return (
    <section className="axiom-card file-ingest" data-testid="file-upload-panel">
      <div className="section-heading">
        <span className="section-heading__eyebrow">Ingest</span>
        <h2>Open a local structure</h2>
      </div>

      <p className="section-copy">
        Drag a structure into the workspace or browse from disk. CIF, PDB, and XYZ are handled through the same entry point.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <button
        type="button"
        className={`file-ingest__dropzone ${isDragging ? 'is-dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsDragging(false)
          const file = e.dataTransfer.files?.[0]
          if (file) {
            validateAndReadFile(file)
          }
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <span className="file-ingest__icon">Drop zone</span>
        <span className="file-ingest__label">
          {isDragging ? 'Release to load structure' : 'Drag and drop structure file'}
        </span>
        <span className="file-ingest__caption">or click to browse from this machine</span>
      </button>

      <div className="file-ingest__formats" aria-label="Accepted file formats">
        {accept.split(',').map((format) => (
          <span key={format} className="inline-token">{format}</span>
        ))}
      </div>

      {error && (
        <div
          className={`status-banner ${error.startsWith('Warning') ? 'status-banner--warning' : 'status-banner--error'}`}
          role="status"
        >
          {error}
        </div>
      )}

      <div className="section-footnote">Recommended ceiling: 10 MB for the smoothest in-browser parse cycle.</div>
    </section>
  )
}

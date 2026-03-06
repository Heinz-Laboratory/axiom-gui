import { useRef, useState } from 'react'
import { SUPPORTED_STRUCTURE_ACCEPT } from '../types/cif'

interface FileUploadProps {
  onFileLoad: (content: string, filename: string) => void
  accept?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

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

  function handleClick() {
    fileInputRef.current?.click()
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      validateAndReadFile(file)
    }
  }

  return (
    <section className="axiom-card file-ingest" data-testid="file-upload-panel">
      <div className="section-heading">
        <span className="section-heading__eyebrow">Ingest</span>
        <h2>Open a local structure</h2>
      </div>

      <p className="section-copy">
        Load crystallographic, biomolecular, or coordinate-only files directly into the active scene.
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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <span className="file-ingest__label">
          {isDragging ? 'Drop structure file here' : 'Drag and drop structure file'}
        </span>
        <span className="file-ingest__caption">or click to browse from this machine</span>
        <span className="file-ingest__formats">Accepted: {accept}</span>
      </button>

      {error && (
        <div
          className={`status-banner ${error.startsWith('Warning') ? 'status-banner--warning' : 'status-banner--error'}`}
          role="status"
        >
          {error}
        </div>
      )}

      <div className="section-footnote">Max recommended file size: 10 MB</div>
    </section>
  )
}

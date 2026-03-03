import { useRef, useState } from 'react'

interface FileUploadProps {
  onFileLoad: (content: string, filename: string) => void
  accept?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export function FileUpload({ onFileLoad, accept = '.cif' }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function validateAndReadFile(file: File) {
    setError(null)

    // Validate file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!accept.includes(extension)) {
      setError(`Invalid file type. Expected ${accept}`)
      return
    }

    // Validate file size (warn if >10 MB)
    if (file.size > MAX_FILE_SIZE) {
      setError(`Warning: Large file (${(file.size / 1024 / 1024).toFixed(1)} MB). This may take a while to parse.`)
      // Continue anyway - it's just a warning
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        onFileLoad(content, file.name)
        setError(null)
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
  }

  function handleClick() {
    fileInputRef.current?.click()
  }

  // Drag and drop handlers
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
    <div style={{
      padding: '20px',
      background: '#2a2a2a',
      borderRadius: '8px',
      marginBottom: '20px',
    }}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Drag and drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{
          padding: '30px 20px',
          border: `2px dashed ${isDragging ? '#4CAF50' : '#555'}`,
          borderRadius: '8px',
          background: isDragging ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.2s',
          textAlign: 'center',
        }}
      >
        <div style={{
          fontSize: '32px',
          marginBottom: '10px',
        }}>
          {isDragging ? '📂' : '📁'}
        </div>
        <div style={{
          fontSize: '14px',
          color: isDragging ? '#4CAF50' : '#ddd',
          fontWeight: '500',
          marginBottom: '8px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          {isDragging ? 'Drop file here' : 'Drag & drop CIF file'}
        </div>
        <div style={{
          fontSize: '12px',
          color: '#888',
          fontFamily: 'monospace',
        }}>
          or click to browse
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          marginTop: '12px',
          padding: '10px',
          background: error.startsWith('Warning') ? '#664400' : '#4a1a1a',
          borderRadius: '4px',
          fontSize: '12px',
          color: error.startsWith('Warning') ? '#ffaa00' : '#ff6666',
          fontFamily: 'monospace',
          border: `1px solid ${error.startsWith('Warning') ? '#aa6600' : '#661111'}`,
        }}>
          {error}
        </div>
      )}

      <div style={{
        marginTop: '12px',
        fontSize: '11px',
        color: '#666',
        textAlign: 'center',
        fontFamily: 'monospace',
      }}>
        Supported: {accept} • Max size: 10 MB
      </div>
    </div>
  )
}

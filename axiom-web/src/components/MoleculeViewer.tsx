import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { initWasm, WasmRenderer } from '../wasm/axiom-renderer'
import { FileUpload } from './FileUpload'
import { StructureInfo } from './StructureInfo'
import { SampleFileDropdown } from './SampleFileDropdown'
import { RenderSettingsPanel } from './RenderSettingsPanel'
import { MeasurementOverlay } from './MeasurementOverlay'
import { CameraControlsPanel } from './CameraControlsPanel'
import { Skeleton } from './Skeleton'
import { useRenderSettings } from '../contexts/RenderSettingsContext'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useSelection } from '../contexts/SelectionContext'
import { useCameraPresets } from '../hooks/useCameraPresets'
import { useCameraAnimation } from '../hooks/useCameraAnimation'
import type { CifMetadata } from '../types/cif'

// Lazy-loaded components (loaded on demand when structure is loaded)
const ExportPanel = lazy(() => import('./ExportPanel').then(m => ({ default: m.ExportPanel })))
const MeasurementPanel = lazy(() => import('./MeasurementPanel').then(m => ({ default: m.MeasurementPanel })))
const CameraPresetsPanel = lazy(() => import('./CameraPresetsPanel').then(m => ({ default: m.CameraPresetsPanel })))

interface StructureData {
  atomCount: number
  elements: string[]
  bondCount: number
  bounds?: number[]
  cellParams?: {
    a: number
    b: number
    c: number
    alpha: number
    beta: number
    gamma: number
  }
  spaceGroup?: string
  elementCounts?: Record<string, number>
}

interface MoleculeViewerProps {
  showKeyboardHelp: boolean
  setShowKeyboardHelp: (show: boolean) => void
}

export function MoleculeViewer({ showKeyboardHelp, setShowKeyboardHelp }: MoleculeViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<WasmRenderer | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingStructure, setIsLoadingStructure] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [structureData, setStructureData] = useState<StructureData | null>(null)
  const [filename, setFilename] = useState<string>('')
  const lastMousePos = useRef({ x: 0, y: 0 })
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [isPinching, setIsPinching] = useState(false)
  const [initialPinchDistance, setInitialPinchDistance] = useState(0)
  const { applyToRenderer, updateRenderMode } = useRenderSettings()
  const {
    selectedAtoms,
    measurementMode,
    selectAtom,
    toggleAtomSelection,
    clearSelection,
    selectAllAtoms,
    setMeasurementMode,
  } = useSelection()

  // Camera animation state and hooks
  const [isAnimating, setIsAnimating] = useState(false)
  const { customPresets, savePreset, deletePreset } = useCameraPresets()

  // Start animation rendering loop when animating
  useCameraAnimation(rendererRef, isAnimating, () => setIsAnimating(false))

  // Keyboard shortcuts configuration
  const shortcuts = [
    // File operations
    {
      key: 'o',
      ctrl: true,
      handler: () => fileInputRef.current?.click(),
      description: 'Open file',
      category: 'file' as const,
    },
    {
      key: 's',
      ctrl: true,
      handler: () => {
        // Save functionality not yet implemented - placeholder
        console.log('Save structure (not yet implemented)')
      },
      description: 'Save structure',
      category: 'file' as const,
    },
    {
      key: 'e',
      ctrl: true,
      handler: () => {
        // Export panel auto-focus - already visible when structure loaded
        console.log('Export panel (already visible when structure loaded)')
      },
      description: 'Export',
      category: 'file' as const,
    },

    // View controls - render mode shortcuts
    {
      key: '1',
      handler: () => {
        updateRenderMode({ type: 'ball-and-stick', atomScale: 1.0, bondRadius: 0.15 })
        if (rendererRef.current) applyToRenderer(rendererRef.current)
      },
      description: 'Ball-and-stick mode',
      category: 'view' as const,
    },
    {
      key: '2',
      handler: () => {
        updateRenderMode({ type: 'spacefill', vdwScale: 1.0 })
        if (rendererRef.current) applyToRenderer(rendererRef.current)
      },
      description: 'Spacefill mode',
      category: 'view' as const,
    },
    {
      key: '3',
      handler: () => {
        updateRenderMode({ type: 'stick', atomRadius: 0.3, bondRadius: 0.15 })
        if (rendererRef.current) applyToRenderer(rendererRef.current)
      },
      description: 'Stick mode',
      category: 'view' as const,
    },
    {
      key: '4',
      handler: () => {
        updateRenderMode({ type: 'wireframe', lineWidth: 2.0 })
        if (rendererRef.current) applyToRenderer(rendererRef.current)
      },
      description: 'Wireframe mode',
      category: 'view' as const,
    },
    {
      key: 'f',
      handler: () => {
        // Fit to view - reset camera to default position
        if (rendererRef.current) {
          // Use set_camera_position to reset to default view
          rendererRef.current.set_camera_position(
            0, 0, 10,  // eye position (x, y, z)
            0, 0, 0    // target (x, y, z)
          )
        }
      },
      description: 'Fit to view',
      category: 'view' as const,
    },
    {
      key: 'r',
      handler: () => {
        // Reset camera to default position
        if (rendererRef.current) {
          // Use set_camera_position to reset to default view
          rendererRef.current.set_camera_position(
            0, 0, 10,  // eye position (x, y, z)
            0, 0, 0    // target (x, y, z)
          )
        }
      },
      description: 'Reset camera',
      category: 'view' as const,
    },

    // Selection operations
    {
      key: 'a',
      ctrl: true,
      handler: () => {
        if (rendererRef.current && structureData) {
          // Select all atoms (0 to atomCount-1)
          selectAllAtoms(structureData.atomCount)
          // Sync with backend
          for (let i = 0; i < structureData.atomCount; i++) {
            rendererRef.current.select_atom(i)
          }
          rendererRef.current.render([])
        }
      },
      description: 'Select all atoms',
      category: 'selection' as const,
    },
    {
      key: 'Escape',
      handler: () => {
        if (rendererRef.current) {
          clearSelection()
          rendererRef.current.clear_selection()
          rendererRef.current.render([])
        }
      },
      description: 'Deselect all',
      category: 'selection' as const,
    },
    {
      key: 'm',
      handler: () => {
        setMeasurementMode(!measurementMode)
      },
      description: 'Toggle measurement mode',
      category: 'selection' as const,
    },

    // Help dialog
    {
      key: '?',
      handler: () => setShowKeyboardHelp(true),
      description: 'Show keyboard shortcuts',
      category: 'other' as const,
    },
  ]

  // Enable shortcuts when structure is loaded OR when keyboard help is open
  useKeyboardShortcuts(shortcuts, structureData !== null || showKeyboardHelp)

  useEffect(() => {
    let mounted = true
    let animationFrameId: number

    async function initializeRenderer() {
      try {
        if (!canvasRef.current) return

        // Initialize WASM module
        await initWasm()

        if (!mounted) return

        // Create renderer instance
        const renderer = new WasmRenderer()
        rendererRef.current = renderer

        // Initialize with canvas
        await renderer.initialize(canvasRef.current)

        if (!mounted) return

        setIsLoading(false)

        // Apply render settings
        applyToRenderer(renderer)

        // Render test scene (single red sphere)
        // The renderer expects atom data, but for now we'll just call render with empty data
        // The Rust code should render a test sphere by default
        renderer.render([])

        // Start animation loop
        function animate() {
          if (rendererRef.current && mounted) {
            rendererRef.current.render([])
            animationFrameId = requestAnimationFrame(animate)
          }
        }
        animate()
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error('Renderer initialization failed:', errorMessage, err);
          setError(errorMessage || 'Failed to initialize renderer')
          setIsLoading(false)
        }
      }
    }

    initializeRenderer()

    return () => {
      mounted = false
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      if (rendererRef.current) {
        rendererRef.current.free()
        rendererRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function handleResize() {
      if (canvas && rendererRef.current) {
        const width = canvas.clientWidth
        const height = canvas.clientHeight
        canvas.width = width
        canvas.height = height
        rendererRef.current.resize(width, height)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle CIF file load
  function handleFileLoad(content: string, fname: string) {
    if (!rendererRef.current) {
      setFileError('Renderer not initialized')
      return
    }

    setIsLoadingStructure(true)
    setError(null)
    setFileError(null)

    // Use setTimeout to allow loading spinner to render
    setTimeout(() => {
      try {
        // Load CIF into renderer
        const metadataJson = rendererRef.current!.load_cif(content)
        const metadata = JSON.parse(metadataJson) as CifMetadata

        // Convert to StructureData format
        const structureData: StructureData = {
          atomCount: metadata.atom_count,
          elements: Object.keys(metadata.elements),
          bondCount: metadata.bond_count,
          bounds: metadata.bounds,
          cellParams: metadata.cell_params,
          spaceGroup: metadata.space_group,
          elementCounts: metadata.elements,
        }

        setStructureData(structureData)
        setFilename(fname)
        setError(null)
        setFileError(null)

        console.log('CIF loaded:', structureData)
      } catch (err) {
        setFileError(err instanceof Error ? err.message : 'Failed to load CIF file')
        console.error('CIF load error:', err)
      } finally {
        setIsLoadingStructure(false)
      }
    }, 50)
  }

  function handleShortcutFileSelection(file: File) {
    const extension = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
    if (extension !== '.cif') {
      setFileError('Invalid file type. Expected .cif')
      return
    }

    setFileError(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      const content = evt.target?.result as string
      if (content) {
        handleFileLoad(content, file.name)
      }
    }
    reader.onerror = () => {
      setFileError('Failed to read file')
    }
    reader.readAsText(file)
  }

  // Handle sample file load
  function handleSampleLoad(content: string, name: string) {
    handleFileLoad(content, name)
  }

  // Mouse drag for rotation
  function handleMouseDown(e: React.MouseEvent) {
    setIsDragging(true)
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging || !rendererRef.current) return

    const deltaX = e.clientX - lastMousePos.current.x
    const deltaY = e.clientY - lastMousePos.current.y

    rendererRef.current.rotate(deltaX, deltaY)

    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  function handleMouseUp() {
    setIsDragging(false)
  }

  // Mouse wheel for zoom
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    if (!rendererRef.current) return

    const delta = e.deltaY * -0.01
    rendererRef.current.zoom(delta)
  }

  // Click to select atoms
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!rendererRef.current || !canvasRef.current || !structureData) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Call WASM pick_atom_at_screen
    const result = rendererRef.current.pick_atom_at_screen(x, y)

    if (result) {
      // TypeScript doesn't know the exact shape, so we need to cast
      const atomIndex = (result as { atomIndex: number }).atomIndex

      if (e.ctrlKey || e.metaKey) {
        // Ctrl+Click: toggle selection
        toggleAtomSelection(atomIndex)
        // Sync backend selection state
        if (selectedAtoms.includes(atomIndex)) {
          rendererRef.current.deselect_atom(atomIndex)
        } else {
          rendererRef.current.select_atom(atomIndex)
        }
      } else if (e.shiftKey) {
        // Shift+Click: add to selection
        if (!selectedAtoms.includes(atomIndex)) {
          toggleAtomSelection(atomIndex)
          rendererRef.current.select_atom(atomIndex)
        }
      } else {
        // Normal click: select only this atom
        clearSelection()
        selectAtom(atomIndex)
        rendererRef.current.clear_selection()
        rendererRef.current.select_atom(atomIndex)
      }

      // Re-render to show selection highlight
      rendererRef.current.render([])
    } else if (!e.ctrlKey && !e.shiftKey) {
      // Clicked empty space, clear selection
      clearSelection()
      rendererRef.current.clear_selection()
      rendererRef.current.render([])
    }
  }

  // Camera preset handlers
  function handlePresetClick(preset: string) {
    try {
      setIsAnimating(true)
      rendererRef.current?.animate_to_preset(preset, 400) // 400ms animation
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setIsAnimating(false)
    }
  }

  function handleSavePreset(name: string, state: { position: [number, number, number], target: [number, number, number], up: [number, number, number], fov: number }) {
    savePreset(name, state)
  }

  function handleLoadPreset(state: { position: [number, number, number], target: [number, number, number], up: [number, number, number], fov: number }) {
    try {
      setIsAnimating(true)
      rendererRef.current?.animate_camera_to(
        state.position[0], state.position[1], state.position[2],
        state.target[0], state.target[1], state.target[2],
        400 // 400ms animation
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setIsAnimating(false)
    }
  }

  function getCurrentCameraState() {
    try {
      const stateJson = rendererRef.current?.get_camera_state()
      if (!stateJson) return null

      // Parse the JSON string returned from WASM
      const state = JSON.parse(stateJson)
      return {
        position: state.eye as [number, number, number],
        target: state.target as [number, number, number],
        up: state.up as [number, number, number],
        fov: state.fovy as number,
      }
    } catch (err) {
      console.error('Failed to get camera state:', err)
      return null
    }
  }

  function handleCameraReset() {
    try {
      // Reset to default position
      rendererRef.current?.set_camera_position(0, 0, 10, 0, 0, 0)
      rendererRef.current?.render([])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function handleFitToView() {
    // Fit to view is handled automatically when loading structure
    // For now, just reset to default
    handleCameraReset()
  }

  // Touch gesture handlers
  function getPinchDistance(touch1: React.Touch, touch2: React.Touch): number {
    const dx = touch2.clientX - touch1.clientX
    const dy = touch2.clientY - touch1.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  function handleTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()

    if (e.touches.length === 1) {
      // Single touch - rotation
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    } else if (e.touches.length === 2) {
      // Two touches - pinch zoom
      const distance = getPinchDistance(e.touches[0], e.touches[1])
      setIsPinching(true)
      setInitialPinchDistance(distance)
      setTouchStart(null) // Cancel rotation
    }
  }

  function handleTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()

    if (!rendererRef.current) return

    if (e.touches.length === 1 && touchStart && !isPinching) {
      // Rotate camera
      const deltaX = e.touches[0].clientX - touchStart.x
      const deltaY = e.touches[0].clientY - touchStart.y
      rendererRef.current.rotate(deltaX, deltaY)
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    } else if (e.touches.length === 2 && isPinching) {
      // Zoom camera
      const distance = getPinchDistance(e.touches[0], e.touches[1])
      const delta = (distance - initialPinchDistance) * 0.01
      rendererRef.current.zoom(delta)
      setInitialPinchDistance(distance)
    }
  }

  function handleTouchEnd() {
    setTouchStart(null)
    setIsPinching(false)
    setInitialPinchDistance(0)
  }

  if (error) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
        color: '#ff4444',
        fontFamily: 'monospace',
        fontSize: '14px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div>
          <div style={{ marginBottom: '10px' }}>⚠️ Renderer Error</div>
          <div>{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden', position: 'relative', background: '#1a1a1a' }}>
      {/* Hidden file input for Ctrl+O shortcut */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".cif"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            handleShortcutFileSelection(file)
          }
          // Reset input so the same file can be loaded again
          e.target.value = ''
        }}
      />

      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#888',
          fontFamily: 'monospace',
          fontSize: '14px',
          zIndex: 10
        }}>
          Loading WASM module...
        </div>
      )}

      {/* Structure loading spinner */}
      {isLoadingStructure && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 'calc(50% - 150px)',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '20px 30px',
          borderRadius: '8px',
          color: '#4CAF50',
          fontFamily: 'monospace',
          fontSize: '14px',
          zIndex: 1000,
          border: '1px solid #4CAF50',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '3px solid #4CAF50',
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <span>Parsing CIF file...</span>
        </div>
      )}

      {/* Sidebar */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '300px',
        height: '100%',
        background: '#1a1a1a',
        padding: '20px',
        boxSizing: 'border-box',
        overflowY: 'auto',
        zIndex: 100,
        borderLeft: '1px solid #333',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#fff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
            Axiom Web Viewer
          </div>
          <button
            onClick={() => setShowKeyboardHelp(true)}
            title="Keyboard shortcuts (Press ? for help)"
            style={{
              background: 'none',
              border: '1px solid #444',
              borderRadius: '4px',
              color: '#aaa',
              fontSize: '16px',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s, color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.color = '#fff'
              e.currentTarget.style.borderColor = '#666'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#aaa'
              e.currentTarget.style.borderColor = '#444'
            }}
          >
            ?
          </button>
        </div>

        <SampleFileDropdown onLoadSample={handleSampleLoad} />
        <FileUpload onFileLoad={handleFileLoad} />
        {fileError && (
          <div
            data-testid="file-load-error"
            style={{
              marginBottom: '20px',
              padding: '10px',
              background: '#4a1a1a',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#ff6666',
              fontFamily: 'monospace',
              border: '1px solid #661111',
            }}
          >
            {fileError}
          </div>
        )}
        <StructureInfo data={structureData} filename={filename} />
        <RenderSettingsPanel />
        <Suspense fallback={<Skeleton variant="rectangular" height={120} />}>
          <CameraPresetsPanel
            onPresetClick={handlePresetClick}
            onSavePreset={handleSavePreset}
            onLoadPreset={handleLoadPreset}
            getCurrentState={getCurrentCameraState}
            customPresets={customPresets}
            onDeletePreset={deletePreset}
          />
        </Suspense>
        <CameraControlsPanel
          onReset={handleCameraReset}
          onFitToView={handleFitToView}
        />
        {structureData && (
          <Suspense fallback={<Skeleton variant="rectangular" height={200} />}>
            <MeasurementPanel renderer={rendererRef.current} />
            <ExportPanel
              renderer={rendererRef.current}
              structureName={filename || 'molecule'}
            />
          </Suspense>
        )}
      </div>

      {/* Measurement overlay on canvas */}
      {structureData && (
        <MeasurementOverlay canvasRef={canvasRef} renderer={rendererRef.current} />
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: 'calc(100% - 300px)',
          height: '100%',
          display: 'block',
          cursor: isDragging ? 'grabbing' : 'pointer',
          touchAction: 'none'
        }}
        aria-label="3D molecular visualization canvas. Click to select atoms. Drag to rotate. Scroll to zoom. On touch devices: drag with one finger to rotate, pinch with two fingers to zoom."
      />
    </div>
  )
}

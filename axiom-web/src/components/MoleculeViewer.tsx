import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { initWasm, WasmRenderer } from '../wasm/axiom-renderer'
import { FileUpload } from './FileUpload'
import { StructureInfo } from './StructureInfo'
import { SampleFileDropdown } from './SampleFileDropdown'
import { RenderSettingsPanel } from './RenderSettingsPanel'
import { MeasurementOverlay } from './MeasurementOverlay'
import { CameraControlsPanel } from './CameraControlsPanel'
import { AgentConsolePanel } from './AgentConsolePanel'
import { Skeleton } from './Skeleton'
import { useRenderSettings } from '../contexts/RenderSettingsContext'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useSelection } from '../contexts/SelectionContext'
import { useCameraPresets } from '../hooks/useCameraPresets'
import { useCameraAnimation } from '../hooks/useCameraAnimation'
import { SUPPORTED_STRUCTURE_ACCEPT, structureMetadataToStructureData, type StructureData, type StructureMetadata } from '../types/cif'
import './MoleculeViewer.css'

const ExportPanel = lazy(() => import('./ExportPanel').then((m) => ({ default: m.ExportPanel })))
const MeasurementPanel = lazy(() => import('./MeasurementPanel').then((m) => ({ default: m.MeasurementPanel })))
const CameraPresetsPanel = lazy(() => import('./CameraPresetsPanel').then((m) => ({ default: m.CameraPresetsPanel })))

interface MoleculeViewerProps {
  showKeyboardHelp: boolean
  setShowKeyboardHelp: (show: boolean) => void
}

type StructureFormat = 'cif' | 'pdb' | 'xyz'
type DragMode = 'rotate' | 'pan'
type InspectorTab = 'render' | 'camera' | 'measure' | 'export' | 'agent'

interface PickResult {
  atomIndex: number
  element?: string
  position?: [number, number, number]
}

interface PendingStructureLoad {
  content: string
  sourceName: string
  displayName: string
}

const QUICK_RENDER_MODES = [
  { key: 'ball-and-stick', label: 'Ball & Stick' },
  { key: 'spacefill', label: 'Spacefill' },
  { key: 'stick', label: 'Stick' },
  { key: 'wireframe', label: 'Wireframe' },
] as const

const INSPECTOR_TABS: Array<{ key: InspectorTab; label: string; description: string }> = [
  { key: 'render', label: 'Render', description: 'Appearance and performance' },
  { key: 'camera', label: 'Camera', description: 'Views and navigation' },
  { key: 'measure', label: 'Measure', description: 'Selections and geometry' },
  { key: 'export', label: 'Export', description: 'Images and structures' },
  { key: 'agent', label: 'Agent', description: 'Scene automation surface' },
]

function detectStructureFormat(filename: string): StructureFormat | null {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.cif') || lower.endsWith('.mcif')) return 'cif'
  if (lower.endsWith('.pdb') || lower.endsWith('.ent')) return 'pdb'
  if (lower.endsWith('.xyz')) return 'xyz'
  return null
}

function formatLabelFromMode(mode: ReturnType<typeof getRenderModeKey>) {
  switch (mode) {
    case 'ball-and-stick':
      return 'Ball & Stick'
    case 'spacefill':
      return 'Spacefill'
    case 'stick':
      return 'Stick'
    case 'wireframe':
      return 'Wireframe'
  }
}

function getRenderModeKey(renderMode: { type: string }) {
  return renderMode.type as 'ball-and-stick' | 'spacefill' | 'stick' | 'wireframe'
}

function parsePickResult(raw: unknown): PickResult | null {
  if (raw === null || raw === undefined) {
    return null
  }

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as PickResult
    } catch {
      return null
    }
  }

  if (typeof raw === 'object' && 'atomIndex' in raw) {
    const candidate = raw as { atomIndex?: unknown }
    if (typeof candidate.atomIndex === 'number') {
      return raw as PickResult
    }
  }

  return null
}

function summarizeElements(data: StructureData | null) {
  if (!data?.elementCounts) {
    return 'No elemental profile yet'
  }

  return Object.entries(data.elementCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([element, count]) => `${element} ${count}`)
    .join(' · ')
}

function formatStructureFormat(filename: string) {
  const format = detectStructureFormat(filename)
  if (!format) return 'Unknown format'
  return format.toUpperCase()
}

function describeInspectorTab(tab: InspectorTab, hasStructure: boolean) {
  switch (tab) {
    case 'render':
      return hasStructure
        ? 'Tune representation, lighting, and background without leaving the stage.'
        : 'Appearance controls will unlock once a structure is loaded.'
    case 'camera':
      return hasStructure
        ? 'Save views, fit the model, and keep direct manipulation discoverable.'
        : 'Camera tools become useful after the first structure is loaded.'
    case 'measure':
      return hasStructure
        ? 'Create distance and angle measurements from the active selection.'
        : 'Load a structure first to start measuring geometry.'
    case 'export':
      return hasStructure
        ? 'Export imagery, structure files, and shareable scene state from one place.'
        : 'Exports appear once there is an active scene to capture.'
    case 'agent':
      return hasStructure
        ? 'Use the conversational surface for scene commands and future automation.'
        : 'The agent surface is ready, but it needs a structure context.'
  }
}

function detectBrowserLabel() {
  if (typeof navigator === 'undefined') return 'browser'

  const userAgent = navigator.userAgent
  const braveNavigator = navigator as Navigator & { brave?: { isBrave?: () => Promise<boolean> } }
  if (braveNavigator.brave) return 'Brave'
  if (userAgent.includes('Edg/')) return 'Edge'
  if (userAgent.includes('Chrome/')) return 'Chrome'
  if (userAgent.includes('Firefox/')) return 'Firefox'
  if (userAgent.includes('Safari/')) return 'Safari'
  return 'browser'
}

export function MoleculeViewer({ showKeyboardHelp, setShowKeyboardHelp }: MoleculeViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<WasmRenderer | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastMousePos = useRef({ x: 0, y: 0 })
  const dragModeRef = useRef<DragMode>('rotate')
  const didDragRef = useRef(false)
  const rendererBusyRef = useRef(false)

  const [error, setError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingStructure, setIsLoadingStructure] = useState(false)
  const [isRendererReady, setIsRendererReady] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragMode, setDragMode] = useState<DragMode>('rotate')
  const [statusMessage, setStatusMessage] = useState('Initializing renderer...')
  const [structureData, setStructureData] = useState<StructureData | null>(null)
  const [filename, setFilename] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [pendingStructureLoad, setPendingStructureLoad] = useState<PendingStructureLoad | null>(null)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [isPinching, setIsPinching] = useState(false)
  const [initialPinchDistance, setInitialPinchDistance] = useState(0)
  const [activeInspectorTab, setActiveInspectorTab] = useState<InspectorTab>('render')
  const browserLabel = useMemo(() => detectBrowserLabel(), [])

  const { settings, applyToRenderer, updateRenderMode } = useRenderSettings()
  const {
    selectedAtoms,
    measurementMode,
    selectAtom,
    toggleAtomSelection,
    clearSelection,
    clearMeasurements,
    selectAllAtoms,
    setMeasurementMode,
  } = useSelection()

  const [isAnimating, setIsAnimating] = useState(false)
  const { customPresets, savePreset, deletePreset } = useCameraPresets()

  useCameraAnimation(rendererRef, isAnimating, () => setIsAnimating(false))

  function openInspectorTab(tab: InspectorTab, nextStatus?: string) {
    setActiveInspectorTab(tab)
    if (nextStatus) {
      setStatusMessage(nextStatus)
    }
  }

  function renderCurrentFrame() {
    if (!rendererRef.current || rendererBusyRef.current) return

    try {
      rendererRef.current.render([])
    } catch (err) {
      console.error('Render failed:', err)
    }
  }

  function applyNamedRenderMode(mode: 'ball-and-stick' | 'spacefill' | 'stick' | 'wireframe') {
    openInspectorTab('render')

    switch (mode) {
      case 'ball-and-stick':
        updateRenderMode({ type: 'ball-and-stick', atomScale: 1.0, bondRadius: 0.15 })
        setStatusMessage('Render mode set to ball-and-stick')
        return
      case 'spacefill':
        updateRenderMode({ type: 'spacefill', vdwScale: 1.5 })
        setStatusMessage('Render mode set to spacefill')
        return
      case 'stick':
        updateRenderMode({ type: 'stick', atomRadius: 0.2, bondRadius: 0.15 })
        setStatusMessage('Render mode set to stick')
        return
      case 'wireframe':
        updateRenderMode({ type: 'wireframe', lineWidth: 0.1 })
        setStatusMessage('Render mode set to wireframe')
        return
    }
  }

  function handleFitToView() {
    if (!rendererRef.current) return

    try {
      rendererRef.current.fit_to_scene()
      renderCurrentFrame()
      setStatusMessage('Camera fitted to structure')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function handleCameraReset() {
    if (!rendererRef.current) return

    try {
      if (structureData) {
        rendererRef.current.fit_to_scene()
      } else {
        rendererRef.current.set_camera_position(0, 0, 10, 0, 0, 0)
      }
      renderCurrentFrame()
      setStatusMessage('Camera reset to home view')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function handleSelectAllAtoms() {
    if (!rendererRef.current || !structureData) return

    openInspectorTab('measure')
    selectAllAtoms(structureData.atomCount)
    rendererRef.current.clear_selection()
    for (let i = 0; i < structureData.atomCount; i += 1) {
      rendererRef.current.select_atom(i)
    }
    renderCurrentFrame()
    setStatusMessage(`Selected all ${structureData.atomCount} atoms`)
  }

  function handleClearSelection() {
    if (!rendererRef.current) return

    clearSelection()
    rendererRef.current.clear_selection()
    renderCurrentFrame()
    setStatusMessage('Selection cleared')
  }

  const shortcuts = [
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
      handler: () => openInspectorTab('export', 'Export panel is available in the inspector'),
      description: 'Save structure',
      category: 'file' as const,
    },
    {
      key: 'e',
      ctrl: true,
      handler: () => openInspectorTab('export', 'Export panel is available in the inspector'),
      description: 'Export',
      category: 'file' as const,
    },
    {
      key: '1',
      handler: () => applyNamedRenderMode('ball-and-stick'),
      description: 'Ball-and-stick mode',
      category: 'view' as const,
    },
    {
      key: '2',
      handler: () => applyNamedRenderMode('spacefill'),
      description: 'Spacefill mode',
      category: 'view' as const,
    },
    {
      key: '3',
      handler: () => applyNamedRenderMode('stick'),
      description: 'Stick mode',
      category: 'view' as const,
    },
    {
      key: '4',
      handler: () => applyNamedRenderMode('wireframe'),
      description: 'Wireframe mode',
      category: 'view' as const,
    },
    {
      key: 'f',
      handler: () => handleFitToView(),
      description: 'Fit to view',
      category: 'view' as const,
    },
    {
      key: 'r',
      handler: () => handleCameraReset(),
      description: 'Reset camera',
      category: 'view' as const,
    },
    {
      key: 'a',
      ctrl: true,
      handler: () => handleSelectAllAtoms(),
      description: 'Select all atoms',
      category: 'selection' as const,
    },
    {
      key: 'Escape',
      handler: () => handleClearSelection(),
      description: 'Deselect all',
      category: 'selection' as const,
    },
    {
      key: 'm',
      handler: () => {
        openInspectorTab('measure')
        setMeasurementMode(!measurementMode)
        setStatusMessage(`Measurement mode ${!measurementMode ? 'enabled' : 'disabled'}`)
      },
      description: 'Toggle measurement mode',
      category: 'selection' as const,
    },
    {
      key: '?',
      shift: true,
      handler: () => setShowKeyboardHelp(true),
      description: 'Show keyboard shortcuts',
      category: 'other' as const,
    },
  ]

  useKeyboardShortcuts(shortcuts, true)

  useEffect(() => {
    let mounted = true
    let animationFrameId: number

    async function initializeRenderer() {
      try {
        if (!canvasRef.current) return

        await initWasm()
        if (!mounted) return

        const renderer = new WasmRenderer()
        rendererRef.current = renderer
        await renderer.initialize(canvasRef.current)

        if (!mounted) return

        setIsRendererReady(true)
        setIsLoading(false)
        setStatusMessage('Renderer ready')

        applyToRenderer(renderer)
        renderCurrentFrame()

        function animate() {
          if (rendererRef.current && mounted) {
            renderCurrentFrame()
            animationFrameId = requestAnimationFrame(animate)
          }
        }

        animate()
      } catch (err) {
        if (mounted) {
          const errorMessage = err instanceof Error ? err.message : String(err)
          console.error('Renderer initialization failed:', errorMessage, err)
          setError(errorMessage || 'Failed to initialize renderer')
          setIsRendererReady(false)
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
      setIsRendererReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!rendererRef.current) return
    applyToRenderer(rendererRef.current)
    renderCurrentFrame()
  }, [settings, applyToRenderer])

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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function handleNativeWheel(event: WheelEvent) {
      event.preventDefault()
      if (!rendererRef.current) return

      const delta = event.deltaY * 0.01
      rendererRef.current.zoom(delta)
      renderCurrentFrame()
    }

    canvas.addEventListener('wheel', handleNativeWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleNativeWheel)
  }, [])

  const loadStructureFromContent = useCallback((content: string, sourceName: string, displayName = sourceName) => {
    if (!rendererRef.current) {
      setFileError('Renderer not initialized')
      return
    }

    const format = detectStructureFormat(sourceName)
    if (!format) {
      setFileError(`Invalid file type. Expected ${SUPPORTED_STRUCTURE_ACCEPT}`)
      return
    }

    setIsLoadingStructure(true)
    setError(null)
    setFileError(null)
    setStatusMessage(`Parsing ${displayName}...`)

    window.setTimeout(() => {
      try {
        const metadataJson = rendererRef.current!.load_structure(format, content)
        const metadata = JSON.parse(metadataJson) as StructureMetadata
        const nextStructureData = structureMetadataToStructureData(metadata)

        setStructureData(nextStructureData)
        setFilename(displayName)
        setSourceName(sourceName)
        setError(null)
        setFileError(null)
        setStatusMessage(`Loaded ${displayName}`)
        clearSelection()
        clearMeasurements()
        rendererRef.current?.clear_selection()
        rendererRef.current?.clear_measurements()
      } catch (err) {
        setFileError(err instanceof Error ? err.message : `Failed to load ${format.toUpperCase()} file`)
        setStatusMessage(`Failed to load ${displayName}`)
        console.error(`${format.toUpperCase()} load error:`, err)
      } finally {
        setIsLoadingStructure(false)
      }
    }, 50)
  }, [clearMeasurements, clearSelection])

  const requestStructureLoad = useCallback((content: string, sourceName: string, displayName = sourceName) => {
    const format = detectStructureFormat(sourceName)
    if (!format) {
      setFileError(`Invalid file type. Expected ${SUPPORTED_STRUCTURE_ACCEPT}`)
      return
    }

    if (!isRendererReady || !rendererRef.current || isLoading) {
      setPendingStructureLoad({ content, sourceName, displayName })
      setFileError(null)
      setStatusMessage(`Finishing renderer setup — queued ${displayName}`)
      return
    }

    loadStructureFromContent(content, sourceName, displayName)
  }, [isLoading, isRendererReady, loadStructureFromContent])

  useEffect(() => {
    if (!isRendererReady || !rendererRef.current || !pendingStructureLoad || isLoadingStructure) {
      return
    }

    const nextLoad = pendingStructureLoad
    setPendingStructureLoad(null)
    loadStructureFromContent(nextLoad.content, nextLoad.sourceName, nextLoad.displayName)
  }, [isLoadingStructure, isRendererReady, loadStructureFromContent, pendingStructureLoad])

  function handleShortcutFileSelection(file: File) {
    const format = detectStructureFormat(file.name)
    if (!format) {
      setFileError(`Invalid file type. Expected ${SUPPORTED_STRUCTURE_ACCEPT}`)
      return
    }

    const reader = new FileReader()
    reader.onload = (evt) => {
      const content = evt.target?.result as string
      if (content) {
        requestStructureLoad(content, file.name)
      }
    }
    reader.onerror = () => {
      setFileError('Failed to read file')
    }
    reader.readAsText(file)
  }

  function handleSampleLoad(content: string, displayName: string, sourcePath: string) {
    requestStructureLoad(content, sourcePath, displayName)
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!rendererRef.current) return

    e.preventDefault()
    setIsDragging(true)
    didDragRef.current = false
    dragModeRef.current = e.button === 1 || e.button === 2 || e.altKey ? 'pan' : 'rotate'
    setDragMode(dragModeRef.current)
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDragging || !rendererRef.current) return

    const deltaX = e.clientX - lastMousePos.current.x
    const deltaY = e.clientY - lastMousePos.current.y

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      didDragRef.current = true
    }

    if (dragModeRef.current === 'pan') {
      rendererRef.current.pan(deltaX, deltaY)
    } else {
      rendererRef.current.rotate(deltaX, deltaY)
    }

    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  function handleMouseUp() {
    setIsDragging(false)
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (didDragRef.current) {
      didDragRef.current = false
      return
    }

    if (!rendererRef.current || !canvasRef.current || !structureData) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const pick = parsePickResult(rendererRef.current.pick_atom_at_screen(x, y))

    if (pick) {
      const atomIndex = pick.atomIndex
      openInspectorTab('measure')

      if (e.ctrlKey || e.metaKey) {
        toggleAtomSelection(atomIndex)
        if (selectedAtoms.includes(atomIndex)) {
          rendererRef.current.deselect_atom(atomIndex)
        } else {
          rendererRef.current.select_atom(atomIndex)
        }
      } else if (e.shiftKey) {
        if (!selectedAtoms.includes(atomIndex)) {
          toggleAtomSelection(atomIndex)
          rendererRef.current.select_atom(atomIndex)
        }
      } else {
        clearSelection()
        selectAtom(atomIndex)
        rendererRef.current.clear_selection()
        rendererRef.current.select_atom(atomIndex)
      }

      renderCurrentFrame()
      setStatusMessage(`Selected atom ${atomIndex}`)
    } else if (!e.ctrlKey && !e.shiftKey) {
      handleClearSelection()
    }
  }

  function handlePresetClick(preset: string) {
    try {
      openInspectorTab('camera')
      setIsAnimating(true)
      rendererRef.current?.animate_to_preset(preset, 400)
      setStatusMessage(`Animating to ${preset} preset`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setIsAnimating(false)
    }
  }

  function handleSavePreset(name: string, state: { position: [number, number, number]; target: [number, number, number]; up: [number, number, number]; fov: number }) {
    savePreset(name, state)
    setStatusMessage(`Saved preset ${name}`)
  }

  function handleLoadPreset(state: { position: [number, number, number]; target: [number, number, number]; up: [number, number, number]; fov: number }) {
    try {
      openInspectorTab('camera')
      setIsAnimating(true)
      rendererRef.current?.animate_camera_to(
        state.position[0], state.position[1], state.position[2],
        state.target[0], state.target[1], state.target[2],
        400,
      )
      setStatusMessage('Animating to saved camera preset')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setIsAnimating(false)
    }
  }

  function getCurrentCameraState() {
    try {
      const stateJson = rendererRef.current?.get_camera_state()
      if (!stateJson) return null

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

  function handleAgentCommand(command: string): string {
    const normalized = command.trim().toLowerCase()

    if (!normalized) {
      return 'No command entered.'
    }

    if (!structureData && !normalized.includes('help')) {
      return 'Load a structure first. The long-term goal is a backend operator that can fetch, parse, and manipulate structures without manual setup.'
    }

    if (normalized.includes('help')) {
      return 'Supported local commands: fit structure to view, reset camera, switch to ball and stick, switch to spacefill, switch to stick, switch to wireframe, select all atoms, clear selection.'
    }

    if (normalized.includes('fit')) {
      handleFitToView()
      return 'Fitted the active structure to the viewport.'
    }

    if (normalized.includes('reset')) {
      handleCameraReset()
      return 'Reset the camera to the home view.'
    }

    if (normalized.includes('ball')) {
      applyNamedRenderMode('ball-and-stick')
      return 'Render mode set to ball-and-stick.'
    }

    if (normalized.includes('spacefill') || normalized.includes('cpk')) {
      applyNamedRenderMode('spacefill')
      return 'Render mode set to spacefill.'
    }

    if (normalized.includes('wire')) {
      applyNamedRenderMode('wireframe')
      return 'Render mode set to wireframe.'
    }

    if (normalized.includes('stick')) {
      applyNamedRenderMode('stick')
      return 'Render mode set to stick.'
    }

    if (normalized.includes('select all')) {
      handleSelectAllAtoms()
      return `Selected all ${structureData?.atomCount ?? 0} atoms.`
    }

    if (normalized.includes('clear selection')) {
      handleClearSelection()
      return 'Cleared the current selection.'
    }

    return 'That command is not wired yet. Planned agent actions include semantic selections, measurements, exports, annotations, and repeatable structure-specific workflows.'
  }

  function getPinchDistance(touch1: React.Touch, touch2: React.Touch): number {
    const dx = touch2.clientX - touch1.clientX
    const dy = touch2.clientY - touch1.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  function handleTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()

    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    } else if (e.touches.length === 2) {
      const distance = getPinchDistance(e.touches[0], e.touches[1])
      setIsPinching(true)
      setInitialPinchDistance(distance)
      setTouchStart(null)
    }
  }

  function handleTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault()

    if (!rendererRef.current) return

    if (e.touches.length === 1 && touchStart && !isPinching) {
      const deltaX = e.touches[0].clientX - touchStart.x
      const deltaY = e.touches[0].clientY - touchStart.y
      rendererRef.current.rotate(deltaX, deltaY)
      setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    } else if (e.touches.length === 2 && isPinching) {
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

  const renderModeLabel = formatLabelFromMode(getRenderModeKey(settings.renderMode))
  const stageTitle = filename || 'No structure loaded'
  const structureFormatLabel = sourceName ? formatStructureFormat(sourceName) : 'No file'
  const dominantElementSummary = summarizeElements(structureData)
  const sceneStats = useMemo(() => {
    if (!structureData) return []

    return [
      { label: 'Atoms', value: structureData.atomCount.toLocaleString() },
      { label: 'Bonds', value: structureData.bondCount.toLocaleString() },
      { label: 'Selection', value: selectedAtoms.length.toLocaleString() },
      { label: 'Mode', value: renderModeLabel },
    ]
  }, [renderModeLabel, selectedAtoms.length, structureData])

  const sceneMeta = useMemo(() => {
    if (!structureData) {
      return [
        { label: 'Format', value: structureFormatLabel },
        { label: 'State', value: 'Awaiting structure' },
        { label: 'Workflow', value: 'Load a sample or local file' },
      ]
    }

    return [
      { label: 'Format', value: structureFormatLabel },
      { label: 'Elements', value: structureData.elements.length.toLocaleString() },
      { label: 'Space group', value: structureData.spaceGroup ?? 'Not specified' },
    ]
  }, [structureData, structureFormatLabel])

  const compatibilityTips = useMemo(() => {
    if (!error || !/(WebGL|WebGPU|GPU adapter|graphics acceleration|surface)/i.test(error)) {
      return []
    }

    const tips = [
      browserLabel === 'Brave' ? 'Open brave://gpu and confirm WebGL/WebGL2 are enabled.' : 'Open your browser GPU diagnostics page and confirm WebGL/WebGL2 are enabled.',
      'Keep hardware acceleration enabled, then restart the browser.',
      'Try a fresh private or guest window with extensions and wallet injections disabled.',
    ]

    if (browserLabel === 'Brave') {
      tips.splice(1, 0, 'Reduce Brave Shields or fingerprinting protections for this site if graphics APIs are being blocked.')
    }

    return tips
  }, [browserLabel, error])

  if (error) {
    return (
      <div className="axiom-error-screen">
        <div className="axiom-error-screen__card">
          <p className="axiom-error-screen__eyebrow">Renderer error</p>
          <h1>Axiom could not initialize the scene.</h1>
          <p>{error}</p>
          {compatibilityTips.length > 0 && (
            <div className="axiom-error-screen__tips">
              <h2>Compatibility checklist</h2>
              <ul className="axiom-error-screen__list">
                {compatibilityTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="axiom-shell">
      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_STRUCTURE_ACCEPT}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            handleShortcutFileSelection(file)
          }
          e.target.value = ''
        }}
      />

      <header className="workbench-header">
        <div className="workbench-header__identity" data-testid="app-shell-header">
          <span className="section-heading__eyebrow">Light-first molecular analysis workbench</span>
          <div className="workbench-header__title-row">
            <h1>Axiom Molecular Workbench</h1>
            <span className="status-pill status-pill--accent">Scientific preview</span>
          </div>
          <p>
            A calmer web lab for structure ingestion, scene inspection, render QA, and future agent-native manipulation.
          </p>
        </div>

        <div className="workbench-header__scene-summary" aria-live="polite">
          <div className="summary-chip">
            <span>Scene</span>
            <strong>{structureData ? stageTitle : 'Awaiting structure'}</strong>
          </div>
          <div className="summary-chip">
            <span>Status</span>
            <strong>{structureData ? 'Ready' : 'Idle'}</strong>
          </div>
          <div className="summary-chip">
            <span>Format</span>
            <strong>{structureFormatLabel}</strong>
          </div>
        </div>

        <div className="workbench-header__actions">
          <button type="button" className="primary-action" onClick={() => fileInputRef.current?.click()}>
            Open structure
          </button>
          <button type="button" className="secondary-action" onClick={handleFitToView} disabled={!structureData}>
            Fit to view
          </button>
          <button
            type="button"
            className={`secondary-action ${showKeyboardHelp ? 'is-active' : ''}`}
            aria-pressed={showKeyboardHelp}
            onClick={() => setShowKeyboardHelp(true)}
          >
            Help
          </button>
        </div>
      </header>

      {fileError && (
        <div className="status-banner status-banner--error status-banner--global" data-testid="file-load-error" role="alert">
          {fileError}
        </div>
      )}

      <div className="workbench-grid">
        <aside className="workbench-rail workbench-rail--left">
          <section className="axiom-card session-overview">
            <div className="section-heading">
              <span className="section-heading__eyebrow">Session overview</span>
              <h2>{structureData ? 'Active analysis state' : 'Load a structure to begin'}</h2>
            </div>
            <p className="section-copy">
              {structureData
                ? 'The left rail handles intake and structure context. The stage remains reserved for direct scene work.'
                : 'Start with a vetted sample or a local file. Once loaded, the inspector unlocks scene controls, measurements, exports, and agent actions.'}
            </p>
            <div className="session-overview__meta">
              {sceneMeta.map((item) => (
                <div key={item.label} className="session-overview__meta-item">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
            <div className="session-overview__actions">
              <button type="button" className="secondary-action" onClick={() => openInspectorTab('agent')}>
                Open agent surface
              </button>
              <button type="button" className="secondary-action" onClick={() => openInspectorTab('export')} disabled={!structureData}>
                Prepare export
              </button>
            </div>
          </section>

          <SampleFileDropdown onLoadSample={handleSampleLoad} />
          <FileUpload onFileLoad={requestStructureLoad} />
          <StructureInfo data={structureData} filename={filename} />
        </aside>

        <main className="workbench-stage" id="viewer-stage">
          <section className="axiom-card stage-toolbar">
            <div className="stage-toolbar__primary">
              <div className="section-heading">
                <span className="section-heading__eyebrow">Viewport</span>
                <h2>{stageTitle}</h2>
              </div>
              <p className="section-copy">
                {structureData
                  ? 'Use the viewer for direct inspection and keep secondary tasks in the inspector tabs.'
                  : 'Load a sample or local structure file to activate the molecular stage.'}
              </p>
            </div>

            <div className="stage-toolbar__modes" aria-label="Quick render modes">
              {QUICK_RENDER_MODES.map((mode) => {
                const isActive = getRenderModeKey(settings.renderMode) === mode.key
                return (
                  <button
                    key={mode.key}
                    type="button"
                    className={`mode-chip ${isActive ? 'is-active' : ''}`}
                    aria-pressed={isActive}
                    onClick={() => applyNamedRenderMode(mode.key)}
                  >
                    {mode.label}
                  </button>
                )
              })}
            </div>

            <div className="stage-toolbar__actions">
              <button
                type="button"
                className={`secondary-action ${measurementMode ? 'is-active' : ''}`}
                aria-pressed={measurementMode}
                onClick={() => {
                  openInspectorTab('measure')
                  setMeasurementMode(!measurementMode)
                  setStatusMessage(`Measurement mode ${!measurementMode ? 'enabled' : 'disabled'}`)
                }}
              >
                Measurement mode
              </button>
              <button type="button" className="secondary-action" onClick={() => openInspectorTab('export')} disabled={!structureData}>
                Export
              </button>
              <button type="button" className="secondary-action" onClick={() => openInspectorTab('agent')}>
                Agent
              </button>
            </div>
          </section>

          <section className="stage-board" data-testid="viewer-stage">
            <div className="stage-board__paper" />

            {isLoading && (
              <div className="loading-overlay">
                <div className="loading-overlay__spinner" />
                <span>Loading WASM module...</span>
              </div>
            )}

            {isLoadingStructure && (
              <div className="loading-overlay loading-overlay--structure">
                <div className="loading-overlay__spinner" />
                <span>Parsing structure file...</span>
              </div>
            )}

            <div className="stage-note stage-note--top-left">
              <span className="stage-note__label">Scene</span>
              <strong>{stageTitle}</strong>
              <span>{dominantElementSummary}</span>
            </div>

            <div className="stage-note stage-note--top-right">
              <span className="stage-note__label">Status</span>
              <strong data-testid="status-message">{statusMessage}</strong>
              <span data-testid="measurement-mode-state">
                {measurementMode ? 'Measurement mode enabled' : 'Direct manipulation enabled'}
              </span>
            </div>

            <div className="stage-note stage-note--bottom-left">
              <span className="stage-note__label">Gestures</span>
              <strong>
                {dragMode === 'pan' && isDragging
                  ? 'Panning scene'
                  : dragMode === 'rotate' && isDragging
                    ? 'Rotating scene'
                    : 'Ready for input'}
              </strong>
              <span>Left drag rotate · Right or middle drag pan · Scroll zoom</span>
            </div>

            <div className="stage-note stage-note--bottom-right">
              <span className="stage-note__label">Scene metrics</span>
              {sceneStats.length > 0 ? (
                <div className="stage-metrics">
                  {sceneStats.map((stat) => (
                    <span
                      key={stat.label}
                      className="stage-metrics__chip"
                      data-testid={`stage-metric-${stat.label.toLowerCase()}`}
                    >
                      <strong>{stat.value}</strong>
                      <small>{stat.label}</small>
                    </span>
                  ))}
                </div>
              ) : (
                <span>Load a structure to populate scene metrics.</span>
              )}
            </div>

            {structureData && <MeasurementOverlay canvasRef={canvasRef} renderer={rendererRef.current} />}

            <canvas
              ref={canvasRef}
              data-testid="viewer-canvas"
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onContextMenu={(e) => e.preventDefault()}
              className={`stage-canvas ${isDragging ? 'is-dragging' : ''}`}
              aria-label="3D molecular visualization canvas. Click to select atoms. Drag to rotate. Right-drag or middle-drag to pan. Scroll to zoom."
            />
          </section>
        </main>

        <aside className="workbench-rail workbench-rail--right">
          <section className="axiom-card inspector-shell">
            <div className="inspector-shell__header">
              <div>
                <span className="section-heading__eyebrow">Inspector</span>
                <h2>{INSPECTOR_TABS.find((tab) => tab.key === activeInspectorTab)?.label}</h2>
              </div>
              <div className={`status-pill ${structureData ? 'status-pill--accent' : ''}`}>
                {structureData ? 'Scene loaded' : 'Awaiting structure'}
              </div>
            </div>

            <p className="section-copy inspector-shell__copy">
              {describeInspectorTab(activeInspectorTab, Boolean(structureData))}
            </p>

            <div className="inspector-tabs" role="tablist" aria-label="Inspector sections">
              {INSPECTOR_TABS.map((tab) => {
                const isActive = tab.key === activeInspectorTab
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`inspector-tab ${isActive ? 'is-active' : ''}`}
                    onClick={() => setActiveInspectorTab(tab.key)}
                  >
                    <span>{tab.label}</span>
                    <small>{tab.description}</small>
                  </button>
                )
              })}
            </div>

            <div className="inspector-shell__panel">
              {activeInspectorTab === 'render' && <RenderSettingsPanel />}

              {activeInspectorTab === 'camera' && (
                <div className="inspector-stack">
                  <Suspense fallback={<Skeleton variant="rectangular" height={200} />}>
                    <CameraPresetsPanel
                      onPresetClick={handlePresetClick}
                      onSavePreset={handleSavePreset}
                      onLoadPreset={handleLoadPreset}
                      getCurrentState={getCurrentCameraState}
                      customPresets={customPresets}
                      onDeletePreset={deletePreset}
                    />
                  </Suspense>
                  <CameraControlsPanel onReset={handleCameraReset} onFitToView={handleFitToView} />
                </div>
              )}

              {activeInspectorTab === 'measure' && (
                structureData ? (
                  <Suspense fallback={<Skeleton variant="rectangular" height={220} />}>
                    <MeasurementPanel renderer={rendererRef.current} />
                  </Suspense>
                ) : (
                  <div className="empty-panel-state">
                    <strong>No geometry tools yet</strong>
                    <span>Load a structure to enable selection and measurement workflows.</span>
                  </div>
                )
              )}

              {activeInspectorTab === 'export' && (
                structureData ? (
                  <Suspense fallback={<Skeleton variant="rectangular" height={220} />}>
                    <ExportPanel
                      renderer={rendererRef.current}
                      structureName={filename || 'molecule'}
                      onBusyChange={(busy) => {
                        rendererBusyRef.current = busy
                        setStatusMessage(busy ? 'Exporting image...' : 'Renderer ready')
                      }}
                    />
                  </Suspense>
                ) : (
                  <div className="empty-panel-state">
                    <strong>No export target</strong>
                    <span>Load a structure before exporting imagery, structure files, or scene state.</span>
                  </div>
                )
              )}

              {activeInspectorTab === 'agent' && (
                <AgentConsolePanel
                  hasStructure={structureData !== null}
                  filename={filename}
                  structureData={structureData}
                  selectedCount={selectedAtoms.length}
                  measurementMode={measurementMode}
                  onRunCommand={handleAgentCommand}
                />
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

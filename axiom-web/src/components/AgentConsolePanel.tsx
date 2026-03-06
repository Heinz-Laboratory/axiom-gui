import { useMemo, useState } from 'react'
import type { StructureData } from '../types/cif'

interface AgentConsoleEntry {
  role: 'system' | 'user' | 'agent'
  text: string
}

interface AgentConsolePanelProps {
  hasStructure: boolean
  filename?: string
  structureData: StructureData | null
  selectedCount: number
  measurementMode: boolean
  onRunCommand: (command: string) => string
}

const SUGGESTED_COMMANDS = [
  'fit structure to view',
  'switch to ball and stick',
  'switch to spacefill',
  'switch to stick',
  'clear selection',
]

function summarizeElements(structureData: StructureData | null) {
  if (!structureData?.elementCounts) return 'No scene context yet'

  return Object.entries(structureData.elementCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([element, count]) => `${element}:${count}`)
    .join(' · ')
}

export function AgentConsolePanel({
  hasStructure,
  filename,
  structureData,
  selectedCount,
  measurementMode,
  onRunCommand,
}: AgentConsolePanelProps) {
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState<AgentConsoleEntry[]>([
    {
      role: 'system',
      text: 'Agent console is wired as a local command bridge today. The target state is a scene-aware backend operator that can manipulate selections, camera, measurements, exports, and repeatable analysis workflows.',
    },
  ])

  const contextLine = useMemo(() => {
    if (!hasStructure || !structureData) {
      return 'scene=unloaded · selection=0 · measurement=off'
    }

    return [
      `scene=${filename ?? 'untitled'}`,
      `atoms=${structureData.atomCount}`,
      `bonds=${structureData.bondCount}`,
      `selection=${selectedCount}`,
      `measurement=${measurementMode ? 'on' : 'off'}`,
    ].join(' · ')
  }, [filename, hasStructure, measurementMode, selectedCount, structureData])

  function runCommand(rawCommand: string) {
    const trimmed = rawCommand.trim()
    if (!trimmed) return

    const response = onRunCommand(trimmed)
    setHistory((current) => [
      ...current,
      { role: 'user', text: trimmed },
      { role: 'agent', text: response },
    ])
    setCommand('')
  }

  return (
    <section className="axiom-card agent-console" data-testid="agent-console">
      <div className="agent-console__header">
        <div>
          <div className="section-heading">
            <span className="section-heading__eyebrow">Agent Surface</span>
            <h2>Scene console</h2>
          </div>
          <p className="section-copy">
            VMD-inspired control flow, but web-native and designed for a future backend agent rather than a passive chat box.
          </p>
        </div>
        <div className={`agent-console__status ${hasStructure ? 'is-ready' : ''}`}>
          {hasStructure ? 'Scene loaded' : 'Awaiting structure'}
        </div>
      </div>

      <div className="agent-console__context">
        <span>{contextLine}</span>
        <span>{summarizeElements(structureData)}</span>
      </div>

      <div className="agent-console__log">
        {history.map((entry, index) => (
          <div key={`${entry.role}-${index}`} className={`agent-console__entry agent-console__entry--${entry.role}`}>
            <span className="agent-console__prompt">
              {entry.role === 'user' ? '>' : entry.role === 'system' ? '#' : '$'}
            </span>
            <span>{entry.text}</span>
          </div>
        ))}
      </div>

      <div className="agent-console__composer">
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              runCommand(command)
            }
          }}
          placeholder="e.g. fit structure to view"
          aria-label="Agent console input"
        />
        <button type="button" onClick={() => runCommand(command)}>
          Run
        </button>
      </div>

      <div className="agent-console__suggestions">
        {SUGGESTED_COMMANDS.map((suggestion) => (
          <button key={suggestion} type="button" onClick={() => runCommand(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  )
}

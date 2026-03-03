import { useState, lazy, Suspense } from 'react'
import { MoleculeViewer } from './components/MoleculeViewer'
import { RenderSettingsProvider } from './contexts/RenderSettingsContext'
import { SelectionProvider } from './contexts/SelectionContext'
import { ErrorBoundary } from './components/ErrorBoundary'

// Lazy-load heavy components that aren't immediately needed
const KeyboardShortcutsHelp = lazy(() => import('./components/KeyboardShortcutsHelp').then(m => ({ default: m.KeyboardShortcutsHelp })))

function App() {
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

  return (
    <>
      {/* Skip to main content link for screen readers */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <ErrorBoundary>
        <SelectionProvider>
          <RenderSettingsProvider>
            <div id="main-content" role="main">
              <MoleculeViewer
                showKeyboardHelp={showKeyboardHelp}
                setShowKeyboardHelp={setShowKeyboardHelp}
              />
              {/* Lazy-loaded keyboard shortcuts help dialog */}
              <Suspense fallback={null}>
                <KeyboardShortcutsHelp
                  isOpen={showKeyboardHelp}
                  onClose={() => setShowKeyboardHelp(false)}
                />
              </Suspense>
            </div>
          </RenderSettingsProvider>
        </SelectionProvider>
      </ErrorBoundary>
    </>
  )
}

export default App

// axiom-web/src/components/KeyboardShortcutsHelp.tsx
// Modal dialog displaying all keyboard shortcuts with accessibility support

import { useEffect, useRef } from 'react';
import './KeyboardShortcutsHelp.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
}

const shortcuts: Record<string, Shortcut[]> = {
  file: [
    { keys: ['Ctrl', 'O'], description: 'Open file' },
    { keys: ['Ctrl', 'S'], description: 'Save structure' },
    { keys: ['Ctrl', 'E'], description: 'Export' },
  ],
  view: [
    { keys: ['1'], description: 'Ball-and-stick mode' },
    { keys: ['2'], description: 'Spacefill mode' },
    { keys: ['3'], description: 'Stick mode' },
    { keys: ['4'], description: 'Wireframe mode' },
    { keys: ['F'], description: 'Fit to view' },
    { keys: ['R'], description: 'Reset camera' },
  ],
  selection: [
    { keys: ['Ctrl', 'A'], description: 'Select all atoms' },
    { keys: ['Esc'], description: 'Deselect all' },
    { keys: ['M'], description: 'Measurement mode' },
  ],
  other: [
    { keys: ['?'], description: 'Show this help' },
  ],
};

/**
 * Keyboard shortcuts help dialog component.
 *
 * Features:
 * - Modal dialog with backdrop blur
 * - Keyboard navigation (Tab, Shift+Tab, Esc)
 * - Focus trap (Tab cycles within dialog)
 * - ARIA attributes for screen readers
 * - Professional 2026 styling
 *
 * Accessibility:
 * - role="dialog" for screen readers
 * - aria-labelledby and aria-describedby for context
 * - Focus trap prevents tabbing outside dialog
 * - Esc key closes dialog
 * - Focus restoration on close
 */
export function KeyboardShortcutsHelp({ isOpen, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store previously focused element for restoration
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus dialog on open
    if (dialogRef.current) {
      dialogRef.current.focus();
    }

    // Keyboard event handler for Tab/Esc
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (!focusable || focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);

      // Restore focus on close
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="keyboard-shortcuts-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="keyboard-shortcuts-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="shortcuts-title"
        aria-describedby="shortcuts-description"
        tabIndex={-1}
      >
        <div className="shortcuts-header">
          <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts help"
          >
            ×
          </button>
        </div>

        <p id="shortcuts-description" className="sr-only">
          List of keyboard shortcuts for Axiom molecular viewer
        </p>

        {Object.entries(shortcuts).map(([category, items]) => (
          <div key={category} className="shortcut-category">
            <h3>{category.charAt(0).toUpperCase() + category.slice(1)}</h3>
            <ul>
              {items.map((item, i) => (
                <li key={i}>
                  <span className="shortcut-keys">
                    {item.keys.map((key, j) => (
                      <kbd key={j}>{key}</kbd>
                    ))}
                  </span>
                  <span className="shortcut-description">{item.description}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// axiom-web/src/hooks/useKeyboardShortcuts.ts
// Global keyboard shortcut handling with modifier key support

import { useEffect } from 'react';

export interface ShortcutHandler {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: () => void;
  description: string;
  category: 'file' | 'view' | 'selection' | 'other';
}

/**
 * Hook for handling keyboard shortcuts globally.
 *
 * @param shortcuts - Array of shortcut configurations
 * @param enabled - Whether shortcuts are enabled (default: true)
 *
 * Features:
 * - Cross-platform modifier key support (Ctrl on Windows/Linux, Cmd on macOS)
 * - Automatic exclusion from input fields to prevent conflicts
 * - Prevents default browser actions for handled shortcuts
 * - Cleanup on unmount
 *
 * Example:
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: 'o', ctrl: true, handler: openFile, description: 'Open file', category: 'file' },
 *   { key: '1', handler: setBallAndStick, description: 'Ball-and-stick mode', category: 'view' },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutHandler[],
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in input fields, textareas, or contenteditable elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Find matching shortcut
      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        // For Ctrl shortcuts, match either Ctrl (Windows/Linux) or Meta/Cmd (macOS)
        const ctrlMatch = shortcut.ctrl
          ? (e.ctrlKey || e.metaKey)
          : !e.ctrlKey && !e.metaKey;

        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

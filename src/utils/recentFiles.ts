import type { RecentFile, FileInfo } from '../types/axiom'

const RECENT_FILES_KEY = 'axiom-recent-files'
const MAX_RECENT_FILES = 10

/**
 * Load recent files from localStorage
 */
export function loadRecentFiles(): RecentFile[] {
  try {
    const stored = localStorage.getItem(RECENT_FILES_KEY)
    if (!stored) return []

    const files = JSON.parse(stored) as RecentFile[]
    // Validate structure
    if (!Array.isArray(files)) {
      console.warn('Invalid recent files format in localStorage, clearing')
      localStorage.removeItem(RECENT_FILES_KEY)
      return []
    }

    // Validate each file has required properties
    const validFiles = files.filter(f => {
      const isValid = f &&
        typeof f === 'object' &&
        typeof f.path === 'string' &&
        typeof f.name === 'string' &&
        typeof f.format === 'string' &&
        typeof f.timestamp === 'number'

      if (!isValid) {
        console.warn('Skipping invalid recent file entry:', f)
      }
      return isValid
    })

    // If we filtered out invalid entries, save the cleaned list
    if (validFiles.length !== files.length) {
      saveRecentFiles(validFiles)
    }

    return validFiles
  } catch (error) {
    console.error('Failed to load recent files:', error)
    // Clear corrupted data
    localStorage.removeItem(RECENT_FILES_KEY)
    return []
  }
}

/**
 * Save recent files to localStorage
 */
export function saveRecentFiles(files: RecentFile[]): void {
  try {
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files))
  } catch (error) {
    console.error('Failed to save recent files:', error)
  }
}

/**
 * Add a file to recent files list
 * Handles deduplication and maintains max limit
 */
export function addRecentFile(fileInfo: FileInfo): RecentFile[] {
  const recentFiles = loadRecentFiles()

  // Create recent file entry with current timestamp
  const newEntry: RecentFile = {
    ...fileInfo,
    timestamp: Date.now()
  }

  // Remove any existing entry with same path (deduplication)
  const filtered = recentFiles.filter(f => f.path !== fileInfo.path)

  // Add new entry at the beginning (most recent first)
  const updated = [newEntry, ...filtered]

  // Keep only the most recent MAX_RECENT_FILES
  const trimmed = updated.slice(0, MAX_RECENT_FILES)

  // Save to localStorage
  saveRecentFiles(trimmed)

  return trimmed
}

/**
 * Clear all recent files
 */
export function clearRecentFiles(): void {
  try {
    localStorage.removeItem(RECENT_FILES_KEY)
  } catch (error) {
    console.error('Failed to clear recent files:', error)
  }
}

/**
 * Remove a specific file from recent files
 */
export function removeRecentFile(path: string): RecentFile[] {
  const recentFiles = loadRecentFiles()
  const filtered = recentFiles.filter(f => f.path !== path)
  saveRecentFiles(filtered)
  return filtered
}

import { useCallback } from 'react';
import type { SceneData } from '../types/scene';

const STORAGE_KEY = 'axiom-last-scene';

/**
 * Hook for persisting and restoring scene data to/from LocalStorage
 */
export function useScenePersistence() {
  /**
   * Save scene data to LocalStorage
   */
  const saveScene = useCallback((data: SceneData) => {
    try {
      const json = JSON.stringify(data, null, 2);
      localStorage.setItem(STORAGE_KEY, json);
      return true;
    } catch (error) {
      console.error('Failed to save scene:', error);
      return false;
    }
  }, []);

  /**
   * Load scene data from LocalStorage
   */
  const loadScene = useCallback((): SceneData | null => {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (!json) return null;

      const data = JSON.parse(json) as SceneData;

      // Validate scene data structure
      if (!data.version || !data.cameraState) {
        console.warn('Invalid scene data structure');
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to load scene:', error);
      return null;
    }
  }, []);

  /**
   * Clear saved scene from LocalStorage
   */
  const clearScene = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear scene:', error);
      return false;
    }
  }, []);

  /**
   * Check if a saved scene exists
   */
  const hasScene = useCallback((): boolean => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  }, []);

  return {
    saveScene,
    loadScene,
    clearScene,
    hasScene,
  };
}

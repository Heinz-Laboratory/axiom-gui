import { useEffect, useRef } from 'react'
import type { WasmRenderer } from '../wasm/axiom-renderer'

/**
 * Hook to handle camera animation rendering loop
 *
 * When isAnimating is true, this starts a requestAnimationFrame loop
 * that continuously calls renderer.render() to update the animation.
 * The loop stops when the animation completes or isAnimating becomes false.
 */
export function useCameraAnimation(
  rendererRef: React.RefObject<WasmRenderer | null>,
  isAnimating: boolean,
  onComplete?: () => void
) {
  const animationFrameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!isAnimating || !rendererRef.current) {
      return
    }

    const animate = () => {
      try {
        // Render with animation update (backend handles interpolation in render loop)
        rendererRef.current?.render([])

        // Continue animation loop
        animationFrameRef.current = requestAnimationFrame(animate)
      } catch (err) {
        console.error('Animation error:', err)
        onComplete?.()
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isAnimating, rendererRef, onComplete])
}

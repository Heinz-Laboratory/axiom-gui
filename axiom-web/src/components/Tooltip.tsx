import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './Tooltip.css'

interface TooltipProps {
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  children: React.ReactElement
  disabled?: boolean
}

let tooltipCounter = 0

/**
 * Tooltip component with keyboard accessibility
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  placement = 'top',
  delay = 300,
  children,
  disabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null)
  const [tooltipId] = useState(() => `tooltip-${++tooltipCounter}`)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const showTooltip = useCallback(() => {
    if (disabled) return
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay)
  }, [disabled, delay])

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsVisible(false)
  }, [])

  useEffect(() => {
    if (isVisible && triggerElement) {
      const rect = triggerElement.getBoundingClientRect()
      const tooltipWidth = 200
      const tooltipHeight = 40
      const offset = 8

      let x = 0, y = 0
      switch (placement) {
        case 'top':
          x = rect.left + rect.width / 2 - tooltipWidth / 2
          y = rect.top - tooltipHeight - offset
          break
        case 'bottom':
          x = rect.left + rect.width / 2 - tooltipWidth / 2
          y = rect.bottom + offset
          break
        case 'left':
          x = rect.left - tooltipWidth - offset
          y = rect.top + rect.height / 2 - tooltipHeight / 2
          break
        case 'right':
          x = rect.right + offset
          y = rect.top + rect.height / 2 - tooltipHeight / 2
          break
      }

      const padding = 8
      x = Math.max(padding, Math.min(x, window.innerWidth - tooltipWidth - padding))
      y = Math.max(padding, Math.min(y, window.innerHeight - tooltipHeight - padding))

      setPosition({ x, y })
    }
  }, [isVisible, placement, triggerElement])

  const childProps = children.props as Record<string, unknown>

  const wrappedChild = React.cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      setTriggerElement(node)
      const originalRef = (children as {ref?: React.Ref<HTMLElement>}).ref
      if (originalRef) {
        if (typeof originalRef === 'function') {
          originalRef(node)
        } else if (originalRef && 'current' in originalRef) {
          (originalRef as React.MutableRefObject<HTMLElement | null>).current = node
        }
      }
    },
    onMouseEnter: (e: React.MouseEvent) => {
      showTooltip()
      if (typeof childProps.onMouseEnter === 'function') {
        (childProps.onMouseEnter as (e: React.MouseEvent) => void)(e)
      }
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hideTooltip()
      if (typeof childProps.onMouseLeave === 'function') {
        (childProps.onMouseLeave as (e: React.MouseEvent) => void)(e)
      }
    },
    onFocus: (e: React.FocusEvent) => {
      showTooltip()
      if (typeof childProps.onFocus === 'function') {
        (childProps.onFocus as (e: React.FocusEvent) => void)(e)
      }
    },
    onBlur: (e: React.FocusEvent) => {
      hideTooltip()
      if (typeof childProps.onBlur === 'function') {
        (childProps.onBlur as (e: React.FocusEvent) => void)(e)
      }
    },
    'aria-describedby': isVisible ? tooltipId : undefined
  } as React.HTMLAttributes<HTMLElement>)

  return (
    <>
      {wrappedChild}
      {isVisible && !disabled && createPortal(
        <div
          id={tooltipId}
          role="tooltip"
          className={`tooltip tooltip--${placement}`}
          style={{ left: `${position.x}px`, top: `${position.y}px` }}
        >
          {content}
          <div className={`tooltip__arrow tooltip__arrow--${placement}`} />
        </div>,
        document.body
      )}
    </>
  )
}

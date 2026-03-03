import React from 'react'
import './Skeleton.css'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  variant?: 'text' | 'circular' | 'rectangular'
  animation?: 'pulse' | 'wave' | 'none'
  className?: string
}

/**
 * Skeleton loader component for displaying loading states
 * Supports multiple variants and animations with accessibility
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height,
  variant = 'text',
  animation = 'wave',
  className = ''
}) => {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  }

  // Default heights for variants if not specified
  if (!height) {
    switch (variant) {
      case 'text':
        style.height = '1em'
        break
      case 'circular':
        style.height = style.width
        style.borderRadius = '50%'
        break
      case 'rectangular':
        style.height = '200px'
        break
    }
  }

  if (variant === 'circular' && !height) {
    style.borderRadius = '50%'
  }

  const classes = [
    'skeleton',
    `skeleton--${variant}`,
    animation !== 'none' ? `skeleton--${animation}` : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classes}
      style={style}
      role="status"
      aria-label="Loading content"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="skeleton__sr-only">Loading...</span>
    </div>
  )
}

/**
 * Skeleton text block component - multiple lines of text
 */
export const SkeletonText: React.FC<{
  lines?: number
  width?: string | number
}> = ({ lines = 3, width = '100%' }) => {
  return (
    <div className="skeleton-text" style={{ width: typeof width === 'number' ? `${width}px` : width }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '75%' : '100%'}
          animation="wave"
        />
      ))}
    </div>
  )
}

/**
 * Skeleton card component - rectangular skeleton for cards/panels
 */
export const SkeletonCard: React.FC<{
  width?: string | number
  height?: string | number
}> = ({ width = '100%', height = 200 }) => {
  return (
    <Skeleton
      variant="rectangular"
      width={width}
      height={height}
      animation="wave"
    />
  )
}

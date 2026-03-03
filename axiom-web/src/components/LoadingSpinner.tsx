import React from 'react'
import './LoadingSpinner.css'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  overlay?: boolean
  message?: string
}

/**
 * Loading spinner component with optional overlay and message
 * Respects prefers-reduced-motion for accessibility
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  overlay = false,
  message
}) => {
  const spinner = (
    <div
      className={`loading-spinner loading-spinner--${size}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="loading-spinner__circle" />
      {message && <p className="loading-spinner__message">{message}</p>}
      <span className="loading-spinner__sr-only">Loading...</span>
    </div>
  )

  if (overlay) {
    return (
      <div className="loading-spinner-overlay">
        {spinner}
      </div>
    )
  }

  return spinner
}

import React from 'react'
import './ErrorFallback.css'

interface ErrorFallbackProps {
  error: Error | null
  errorInfo?: React.ErrorInfo | null
  onReset: () => void
}

/**
 * Error fallback UI displayed when ErrorBoundary catches an error
 * User-friendly message with recovery options
 */
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  onReset
}) => {
  // Create GitHub issue URL with pre-filled error details
  const createIssueUrl = (): string => {
    const title = encodeURIComponent(`Error: ${error?.message || 'Unknown error'}`)
    const body = encodeURIComponent(`
**Error Message:**
${error?.message || 'No error message'}

**Stack Trace:**
\`\`\`
${error?.stack || 'No stack trace'}
\`\`\`

**Component Stack:**
\`\`\`
${errorInfo?.componentStack || 'No component stack'}
\`\`\`

**Environment:**
- User Agent: ${navigator.userAgent}
- URL: ${window.location.href}
- Timestamp: ${new Date().toISOString()}
    `.trim())

    return `https://github.com/seanfhear/axiom/issues/new?title=${title}&body=${body}`
  }

  return (
    <div className="error-fallback" role="alert" aria-live="assertive">
      <div className="error-fallback__content">
        <div className="error-fallback__icon" aria-hidden="true">⚠️</div>

        <h1 className="error-fallback__title">Something went wrong</h1>

        <p className="error-fallback__message">
          The application encountered an unexpected error. You can try reloading the page or report this issue to help us improve.
        </p>

        {/* Show error details in development mode */}
        {import.meta.env.DEV && error && (
          <details className="error-fallback__details">
            <summary>Error Details (Development)</summary>
            <div className="error-fallback__error-info">
              <p><strong>Error:</strong> {error.message}</p>
              {error.stack && (
                <pre className="error-fallback__stack">
                  <code>{error.stack}</code>
                </pre>
              )}
              {errorInfo?.componentStack && (
                <>
                  <p><strong>Component Stack:</strong></p>
                  <pre className="error-fallback__stack">
                    <code>{errorInfo.componentStack}</code>
                  </pre>
                </>
              )}
            </div>
          </details>
        )}

        <div className="error-fallback__actions">
          <button
            onClick={onReset}
            className="error-fallback__button error-fallback__button--primary"
            aria-label="Try again by resetting the error boundary"
          >
            Try Again
          </button>

          <a
            href={createIssueUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="error-fallback__button error-fallback__button--secondary"
            aria-label="Report this issue on GitHub (opens in new tab)"
          >
            Report Issue
          </a>

          <button
            onClick={() => window.location.reload()}
            className="error-fallback__button error-fallback__button--secondary"
            aria-label="Reload the page"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  )
}

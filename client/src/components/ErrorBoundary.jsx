import React from 'react';
import logger from '../utils/logger.js';

/**
 * Error Boundary Component
 * Catches React component errors and displays graceful error UI
 * Prevents white screen of death
 * Logs errors for debugging
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error for monitoring
    logger.error('Component Error:', {
      error: error.toString(),
      stack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface p-4">
          <div className="max-w-md w-full text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-display font-bold text-[rgb(var(--text-primary))] mb-2">
              Something went wrong
            </h1>
            <p className="text-[rgb(var(--text-secondary))] mb-6">
              We're sorry! An unexpected error occurred. Our team has been notified and is working to fix it.
            </p>

            {import.meta.env.DEV && (
              <details className="text-left mb-6 p-3 bg-surface-raised rounded-lg border border-red-500/30">
                <summary className="cursor-pointer text-sm font-mono text-red-400 mb-2">
                  Error Details (Dev Only)
                </summary>
                <pre className="text-xs overflow-auto max-h-40 text-red-400/80">
                  {this.state.error?.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.href = '/'}
                className="btn-primary w-full justify-center"
              >
                Go to Homepage
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-ghost w-full justify-center"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

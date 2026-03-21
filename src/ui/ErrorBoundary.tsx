import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ProfiluxAI] Uncaught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const { error, errorInfo, showDetails } = this.state;

      return (
        <div className="flex items-center justify-center min-h-[300px] p-4">
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden animate-scale-in"
            style={{
              background: 'rgba(var(--surface-1), 0.6)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(var(--border), 0.4)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.05) inset',
            }}
          >
            {/* Red accent bar */}
            <div className="h-1 bg-gradient-to-r from-error via-red-400 to-error" />

            <div className="p-6 text-center">
              {/* Crash icon */}
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-error/10 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>

              <h2 className="text-lg font-bold text-text-primary mb-1">Something went wrong</h2>
              <p className="text-sm text-text-secondary mb-5">
                An unexpected error crashed the application. You can try again or reload.
              </p>

              {/* Actions */}
              <div className="flex gap-2 justify-center mb-4">
                <button
                  onClick={this.handleRetry}
                  className="btn-primary flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 4v6h-6" />
                    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                  </svg>
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="btn-ghost"
                >
                  Reload
                </button>
              </div>

              {/* Collapsible details */}
              <button
                onClick={() => this.setState({ showDetails: !showDetails })}
                className="text-2xs text-text-tertiary hover:text-text-secondary transition-colors flex items-center gap-1 mx-auto"
              >
                <svg
                  width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className={`transition-transform duration-200 ${showDetails ? 'rotate-90' : ''}`}
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
                {showDetails ? 'Hide' : 'Show'} error details
              </button>

              {showDetails && (
                <div className="mt-3 p-3 rounded-xl bg-surface-2/80 text-left overflow-auto max-h-[200px] animate-slide-up">
                  <p className="text-xs text-error font-mono mb-2 break-all">
                    {error?.message || 'Unknown error'}
                  </p>
                  {errorInfo?.componentStack && (
                    <pre className="text-2xs text-text-tertiary font-mono whitespace-pre-wrap break-all leading-relaxed">
                      {errorInfo.componentStack.trim()}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

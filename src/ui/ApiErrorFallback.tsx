import React, { useState, useEffect, useCallback, useRef } from 'react';

interface ApiErrorFallbackProps {
  error: string;
  onRetry: () => void;
  onDismiss?: () => void;
}

const RETRY_SECONDS = 10;

export function ApiErrorFallback({ error, onRetry, onDismiss }: ApiErrorFallbackProps) {
  const [countdown, setCountdown] = useState(RETRY_SECONDS);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    setCountdown(RETRY_SECONDS);
    setPaused(false);
  }, [error]);

  useEffect(() => {
    if (paused) {
      clearTimer();
      return;
    }

    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearTimer();
          onRetry();
          return RETRY_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [paused, clearTimer, onRetry]);

  const progress = ((RETRY_SECONDS - countdown) / RETRY_SECONDS) * 100;

  const handleManualRetry = () => {
    clearTimer();
    setCountdown(RETRY_SECONDS);
    onRetry();
  };

  return (
    <div
      className="rounded-2xl overflow-hidden animate-scale-in"
      style={{
        background: 'rgba(var(--surface-1), 0.6)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        border: '1px solid rgba(var(--border), 0.4)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.05) inset',
      }}
    >
      {/* Progress bar */}
      <div className="h-1 bg-surface-3 relative overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-warning to-amber-400 transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-5">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 17h.01" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-text-primary mb-0.5">AI Unavailable</h3>
            <p className="text-xs text-text-secondary mb-3 break-words">
              {error || 'Could not connect to the AI service. This may be a temporary issue.'}
            </p>

            {/* Countdown */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2 text-xs text-text-tertiary">
                <div className="relative w-6 h-6">
                  <svg width="24" height="24" viewBox="0 0 24 24" className="transform -rotate-90">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="rgb(var(--surface-3))" strokeWidth="2" />
                    <circle
                      cx="12" cy="12" r="10" fill="none" stroke="#f59e0b" strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 10}`}
                      strokeDashoffset={`${2 * Math.PI * 10 * (1 - progress / 100)}`}
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-2xs font-bold text-warning">
                    {countdown}
                  </span>
                </div>
                <span>{paused ? 'Paused' : `Retrying in ${countdown}s`}</span>
              </div>

              <button
                onClick={() => setPaused(!paused)}
                className="text-2xs text-text-tertiary hover:text-text-secondary transition-colors px-2 py-1 rounded-lg hover:bg-surface-3/50"
              >
                {paused ? 'Resume' : 'Pause'}
              </button>
            </div>

            {/* Suggestions */}
            <div className="space-y-1.5 mb-4">
              <p className="text-2xs font-semibold text-text-tertiary uppercase tracking-wider">Suggestions</p>
              {[
                'Check if the AI endpoint is accessible',
                'Try switching to a different model in Settings',
                'Verify your network connection',
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-1.5 text-2xs text-text-tertiary">
                  <span className="text-warning mt-0.5">&#x2022;</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleManualRetry}
                className="btn-primary text-xs flex items-center gap-1.5 py-2"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4v6h-6" />
                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                </svg>
                Retry Now
              </button>
              {onDismiss && (
                <button onClick={onDismiss} className="btn-ghost text-xs py-2">
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

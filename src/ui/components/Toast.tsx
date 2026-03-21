import React, { useEffect, useState } from 'react';
import { Toast as ToastType } from '@/shared/types';

interface ToastProps {
  toast: ToastType;
  index: number;
  onRemove: (id: string) => void;
}

const accentColors = {
  success: '#22c55e',
  error: '#ef4444',
  info: '#6366f1',
};

const icons = {
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#22c55e" strokeWidth="1.5" />
      <path d="M5 8l2 2 4-4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.5" />
      <path d="M6 6l4 4M10 6l-4 4" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="#6366f1" strokeWidth="1.5" />
      <path d="M8 7v4M8 5v.5" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

export function ToastNotification({ toast, index, onRemove }: ToastProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const dur = toast.duration || 4000;
    const t = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toast.id), 250);
    }, dur);
    return () => clearTimeout(t);
  }, [toast, onRemove]);

  const color = accentColors[toast.type];

  return (
    <div
      className={`toast-glass ${exiting ? 'toast-exit' : ''}`}
      style={{
        bottom: `${16 + index * 60}px`,
        zIndex: 9999 - index,
        opacity: index >= 3 ? 0 : 1 - index * 0.08,
        transform: exiting ? undefined : `scale(${1 - index * 0.03})`,
      }}
    >
      {/* Accent stripe */}
      <div
        className="toast-stripe"
        style={{ backgroundColor: color }}
      />
      <div className="flex items-center gap-3 px-4 py-3">
        {icons[toast.type]}
        <span className="text-sm text-text-primary flex-1">{toast.message}</span>
        <button
          onClick={() => {
            setExiting(true);
            setTimeout(() => onRemove(toast.id), 250);
          }}
          className="text-text-tertiary hover:text-text-primary transition-colors p-0.5 rounded"
          aria-label="Dismiss"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  // Only show last 3 toasts
  const visible = toasts.slice(-3);
  return (
    <>
      {visible.map((t, i) => (
        <ToastNotification
          key={t.id}
          toast={t}
          index={visible.length - 1 - i}
          onRemove={onRemove}
        />
      ))}
    </>
  );
}

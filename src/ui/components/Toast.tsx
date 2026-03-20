import React, { useEffect, useState } from 'react';
import { Toast as ToastType } from '@/shared/types';

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

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

export function ToastNotification({ toast, onRemove }: ToastProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const dur = toast.duration || 3000;
    const t = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toast.id), 250);
    }, dur);
    return () => clearTimeout(t);
  }, [toast, onRemove]);

  return (
    <div className={`toast ${exiting ? 'toast-exit' : ''}`}>
      {icons[toast.type]}
      <span className="text-sm text-text-primary">{toast.message}</span>
    </div>
  );
}

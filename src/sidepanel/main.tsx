import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from '@/ui/ErrorBoundary';
import { AuthWall } from '../shared/AuthWall';
import '../ui/styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <AuthWall>
      <App />
    </AuthWall>
  </ErrorBoundary>
);

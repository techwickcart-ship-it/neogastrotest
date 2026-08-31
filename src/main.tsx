import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Android Web & Mobile runtime safety guards
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    // Prevent unhandled promise rejections from killing the UI thread
    if (event.reason?.message?.includes('ResizeObserver') || event.reason?.message?.includes('network')) {
      event.preventDefault();
    }
    console.warn('Unhandled promise rejection captured gracefully:', event.reason);
  });

  window.addEventListener('error', (event) => {
    if (event.message?.includes('ResizeObserver loop') || event.message?.includes('Script error')) {
      event.preventDefault();
    }
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}



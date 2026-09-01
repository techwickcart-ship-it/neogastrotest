import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Android Web & Mobile runtime safety guards and Service Worker registration
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    });
  }

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



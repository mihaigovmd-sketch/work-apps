import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Unregister stale service workers in development & preview iframes to prevent stale cache lockups
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const isDev = (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV;
  const isIframe = window.self !== window.top;
  if (isDev || isIframe) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    }).catch(() => {});
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

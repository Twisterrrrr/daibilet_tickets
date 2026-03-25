import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/lib/theme';

import App from './App';

const queryClient = new QueryClient();

if ('serviceWorker' in navigator) {
  // PWA installability for Android Chrome. No offline caching yet.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // ignore
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="daibilet-admin-theme">
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="bottom-right" />
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
);

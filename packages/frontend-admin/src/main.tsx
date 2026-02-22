import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';

import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/lib/theme';

import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="daibilet-admin-theme">
      <App />
      <Toaster position="bottom-right" />
    </ThemeProvider>
  </React.StrictMode>,
);

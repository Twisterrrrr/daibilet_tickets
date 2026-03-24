import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

function manualChunks(id: string): string | undefined {
  if (id.includes('node_modules/react-router')) return 'router';
  if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react-vendor';
  if (id.includes('node_modules/@radix-ui')) return 'radix-ui';
  if (id.includes('node_modules/recharts')) return 'recharts';
  if (id.includes('node_modules/lucide-react')) return 'icons';
  return undefined;
}

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@daibilet/shared'],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: { manualChunks },
    },
    commonjsOptions: {
      include: [/node_modules/, /packages\/shared/],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});


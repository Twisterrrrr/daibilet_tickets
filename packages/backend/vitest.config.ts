import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.spec.ts', 'src/**/*.spec.ts'],
    exclude: ['**/supplier-legal-profile.e2e.spec.ts'],
    globals: false,
  },
  setupFiles: ['./vitest.setup.ts'],
  resolve: {
    alias: {
      '@daibilet/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
});

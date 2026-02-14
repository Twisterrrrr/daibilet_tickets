import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.spec.ts', 'src/**/*.spec.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@daibilet/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
});

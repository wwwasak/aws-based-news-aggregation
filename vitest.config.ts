import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'cdk.out'],
  },
  resolve: {
    alias: {
      '@aws-news/shared': resolve(__dirname, './packages/shared/src'),
      '@aws-news/store': resolve(__dirname, './packages/store/src'),
      '@aws-news/keyword-engine': resolve(__dirname, './packages/keyword-engine/src'),
    },
  },
});


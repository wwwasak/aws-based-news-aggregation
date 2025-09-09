import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  sourcemap: true,
  minify: false,
  target: 'node18',
  external: ['@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb'],
});
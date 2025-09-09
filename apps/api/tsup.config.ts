import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  sourcemap: false,
  minify: true,
  target: 'node18',
  bundle: true,
  external: [
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb',
    'aws-lambda'
  ],
  banner: {
    js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
  },
});
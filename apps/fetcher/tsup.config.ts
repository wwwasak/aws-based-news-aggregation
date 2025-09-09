import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/simple-test.ts'],
  format: ['esm'],
  dts: false,
  clean: true,
  sourcemap: false,
  minify: true,
  target: 'node18',
  bundle: true,
  external: ['@aws-sdk/*', 'aws-lambda', 'fs', 'path', 'os', 'util', 'crypto'],
  banner: {
    js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
  },
});
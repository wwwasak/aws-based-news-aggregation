import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/config-loader.ts', 'src/simple-test.ts'],
  format: ['cjs'],
  dts: false,
  clean: true,
  sourcemap: false,
  minify: false,
  target: 'node18',
  bundle: true,
  external: ['@aws-sdk/*', 'aws-lambda', 'fs', 'path', 'os', 'util', 'crypto'],
});
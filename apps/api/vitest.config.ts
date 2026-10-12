import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
    // Integration tests share one database; run files serially.
    fileParallelism: false,
    hookTimeout: 30_000,
  },
  // SWC emits decorator metadata, which Nest's DI needs (esbuild does not).
  plugins: [swc.vite({ module: { type: 'es6' } })],
});

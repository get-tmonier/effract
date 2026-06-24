import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/worker.ts', 'src/driver.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  external: [
    /^react/,
    /^effect/,
    '@tmonier/effract',
    'react-server-dom-webpack/server',
    'node:async_hooks',
  ],
});

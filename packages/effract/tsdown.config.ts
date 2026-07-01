import { defineConfig } from 'tsdown';

export default defineConfig({
  // Two conditional entries: the `default` (client) and `react-server` (server)
  // exports the bundler picks between — see package.json `exports`.
  entry: ['src/index.client.ts', 'src/index.server.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  external: [/^react/, /^effect/],
});

import { defineConfig } from 'vitest/config';

// `#domain/*`, `#application/*`, `#infrastructure/*` resolve through this
// package's package.json `imports` field — no global aliases, so they stay
// scoped to this package and never leak across the workspace.
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});

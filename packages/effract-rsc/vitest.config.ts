import { defineConfig } from 'vitest/config';

// `#`-imports resolve through this package's package.json `imports` field.
export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});

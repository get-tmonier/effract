import type { KnipConfig } from 'knip';

/**
 * Knip operates on the library packages. Their public entries are inferred from
 * each package's `exports`; we only need to point it at the test files. The
 * example apps under apps/ are intentionally exploratory (each framework wires
 * things its own way) and are excluded — mirroring how argot exempts benchmarks.
 */
const config: KnipConfig = {
  ignore: ['apps/**', 'examples/**', 'landing/**'],
  workspaces: {
    'packages/*': {
      entry: ['src/**/*.test.{ts,tsx}'],
      project: ['src/**/*.{ts,tsx}'],
    },
  },
};

export default config;

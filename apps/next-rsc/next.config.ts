import type { NextConfig } from 'next';

const config: NextConfig = {
  // Our workspace packages ship TypeScript source; let Next compile them.
  transpilePackages: ['@tmonier/effract', '@effract/shared'],
  // The monorepo is typechecked by `tsgo` (just verify), not by Next's bundled tsc.
  typescript: { ignoreBuildErrors: true },
};

export default config;

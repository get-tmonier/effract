const path = require('node:path');

/**
 * Hexagonal boundaries for every package under packages/<name>/src.
 *
 *   domain/          pure protocol + types — the language of the framework.
 *                    May depend on `effect` (the domain vocabulary) but never
 *                    on React or on outer layers.
 *   application/     the interpreter + ports. React-free: React capabilities
 *                    (`use`, `useRef`, ...) arrive through an injected port so
 *                    the reconciler is unit-testable without a renderer.
 *   infrastructure/  adapters that bind the interpreter to a concrete runtime
 *                    (React, RSC/Flight, Web Worker).
 *
 * dependencies.ts / index.ts are the only composition seams.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'domain-stays-pure',
      comment: 'domain must not depend on application or infrastructure',
      severity: 'error',
      from: { path: 'packages/[^/]+/src/domain/' },
      to: { path: 'packages/[^/]+/src/(application|infrastructure)/' },
    },
    {
      name: 'domain-no-react',
      comment: 'domain is renderer-agnostic — no React imports',
      severity: 'error',
      from: { path: 'packages/[^/]+/src/domain/' },
      to: { path: 'node_modules/(react|react-dom)/' },
    },
    {
      name: 'application-no-infra',
      comment: 'application must not depend on infrastructure',
      severity: 'error',
      from: { path: 'packages/[^/]+/src/application/' },
      to: { path: 'packages/[^/]+/src/infrastructure/' },
    },
    {
      name: 'application-no-react',
      comment: 'the interpreter takes React capabilities via a port, never imports React',
      severity: 'error',
      from: { path: 'packages/[^/]+/src/application/' },
      to: { path: 'node_modules/(react|react-dom)/' },
    },
    {
      name: 'no-cross-package-deep',
      comment: 'packages talk through their public entry, never into inner layers',
      severity: 'error',
      from: { path: 'packages/([^/]+)/src/' },
      to: { path: 'packages/(?!\\1)([^/]+)/src/(domain|application|infrastructure)/' },
    },
    {
      name: 'no-orphans',
      comment: 'unreferenced modules are dead weight',
      severity: 'warn',
      from: { orphan: true, pathNot: ['\\.d\\.ts$', '(^|/)index\\.ts$'] },
      to: {},
    },
    {
      name: 'no-circular',
      comment: 'circular dependencies break layering',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    moduleSystems: ['es6'],
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    tsConfig: { fileName: path.resolve(__dirname, 'tsconfig.base.json') },
  },
};

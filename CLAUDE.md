# effract

Write React components as Effect programs. A React Effect Component (REC) is a real React component whose
body is a generator effract drives **inside React's render pass** — `yield*` an Effect service or
`yield* hook(useState(...))` a real React hook. The same body runs in a SPA, on a server, in a Web Worker,
or (resolve-up-front) as an RSC. See [ADR 0001](./docs/adr/0001-fiber-reconciliation.md).

## Task runner

Always use `just`.

```
just verify       # lint + format + typecheck + boundaries + knip + test (the CI gate)
just verify-fix   # same, with lint/format autofixes
just test         # vitest in the library packages
just example bun-ssr        # run an example app
just build-examples         # build all four apps
```

## Architecture

pnpm workspace, single version **catalog** (exact pins, no ranges). Each package is layered hexagonally,
enforced by dependency-cruiser:

```
packages/<name>/src/
  domain/           pure protocol + types — Effect vocabulary, never React
  application/      the interpreter + ports — React-free, capabilities injected
  infrastructure/   adapters — the React binding, the Flight renderer, the worker
  index.ts          the only composition seam (plus subpath entries)
```

- `@tmonier/effract` — core (component/view/hook/Runtime/signals).
- `@tmonier/effract-rsc` — Flight server renderer + Web Worker + `/driver`.
- `@tmonier/effract-vite` — Vite plugin.
- `apps/shared` — the services + composed `AppLive` layer + components every example renders.
- `examples/` — typechecked call-site recipes.

## Conventions

- React 19.2+ and Effect v4 only. `Console`/Effect for side-effects in library code, not `console`.
- `#domain/*`, `#application/*`, `#infrastructure/*` resolve via each package's package.json `imports`
  field — **not** tsconfig `paths` (which would mis-resolve across packages). Typecheck is one root
  `tsgo` program over all `src` (no project references — tsgo + composite + noEmit conflict).
- Client-only modules (`component`, `runtime`, `reactivity`) carry `'use client'`; server-safe REC bodies
  live in modules with no client imports so they also drive as RSCs.
- No abusive lint suppressions. Targeted single-line ignores with a rule code and a reason only.
- Tests behavioural and renderer-agnostic where possible — the interpreter is unit-tested with no DOM.

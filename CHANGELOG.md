# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-06-24

The first public scaffold of effract — React components written as Effect programs.

### Added

- **`@tmonier/effract`** — the core.
  - `component(function* () { ... })`: hook-capable React Effect Components. The body yields both Effect
    services and React hooks (`hook(useState(...))`), interpreted inside React's render pass.
  - `view(effect)`: the resolve-up-front mode, for pure-Effect components.
  - `<Runtime layer={...}>`: builds a `ManagedRuntime` once and provides it to the subtree.
  - Signals bridge: `atom`, `observe`, `<Observe>`, `useAtom`, `useAtomValue`, `useAtomSet` — precise,
    surgical re-renders over Effect `AtomRef`s.
  - Async effects suspend through React's `use`.
- **`@tmonier/effract-rsc`** — drive REC bodies as React Server Components.
  - `serverComponent`, `serverView`, `driveServerRec` (also at `/driver`).
  - `renderToFlightStream`: stream standard Flight behind an Effect runtime.
  - `/worker`: a Web Worker variant (`serveFlight`, `flightFromWorker`).
- **`@tmonier/effract-vite`** — a one-import Vite plugin (React Fast Refresh + Effect/React de-duplication).
- **Examples** — four integrations rendering the same shared components: a Vite SPA, plain Bun streaming
  SSR, Next.js App Router (RSC), and TanStack Start.
- **Recipes** — eight typechecked, copy-pasteable call sites under `examples/`.
- **ADR 0001** — the fiber-reconciliation design and its tradeoffs.

[Unreleased]: https://github.com/get-tmonier/effract/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/get-tmonier/effract/releases/tag/v0.1.0
